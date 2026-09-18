import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT.parent))

from ml.dataset_generator import CANONICAL_COLUMNS, GROUND_TRUTH_COLUMNS, GeneratorConfig, generate, load_files

DATA = ROOT / 'data'
CONFIG = DATA / 'processed' / 'route_config.json'
GEOMETRY = DATA / 'processed' / 'route_geometry.json'


def read_events(path):
    with open(path, encoding='utf-8') as f:
        return [json.loads(line) for line in f]


def test_deterministic_generation(tmp_path):
    cfg = GeneratorConfig(n_buses=2, trips_per_bus_per_day=1, trip_dates=('2026-08-03',), target_records=1000, seed=42, imperfect_rate=0)
    a=tmp_path/'a.jsonl'; b=tmp_path/'b.jsonl'; ra=tmp_path/'ra.json'; rb=tmp_path/'rb.json'
    generate(CONFIG,GEOMETRY,a,ra,cfg); generate(CONFIG,GEOMETRY,b,rb,cfg)
    assert a.read_bytes()==b.read_bytes()


def test_canonical_columns_and_routes():
    events=read_events(DATA/'raw'/'bus_events.jsonl')
    assert len(events)>=10000
    assert all(set(CANONICAL_COLUMNS).issubset(e) for e in events)
    assert {e['route_id'] for e in events} <= {'R01','R02'}


def test_coordinates_speed_and_stop_ids():
    events=read_events(DATA/'raw'/'bus_events.jsonl')
    for e in events:
        if e['latitude'] == 95.0:  # controlled invalid GPS is expected
            continue
        assert -90 <= e['latitude'] <= 90
        assert -180 <= e['longitude'] <= 180
        if e['latitude'] != 95.0:
            assert e['speed_kmh'] >= 0
        assert e['next_stop_id'] is not None
        assert e['next_stop_id'].startswith(e['route_id']+'_S') or e['next_stop_id']=='UNKNOWN_STOP'


def test_trip_chronology_and_route_progression(tmp_path):
    cfg=GeneratorConfig(n_buses=2, trips_per_bus_per_day=1, trip_dates=("2026-08-03",), target_records=1000, seed=42, imperfect_rate=0)
    out=tmp_path/"clean.jsonl"; report=tmp_path/"report.json"
    generate(CONFIG,GEOMETRY,out,report,cfg)
    events=read_events(out)
    stop_order={r['route_id']:[s['stop_id'] for s in r['stops']] for r in json.loads(CONFIG.read_text())['routes']}
    for trip_id in {e['trip_id'] for e in events}:
        rows=sorted([e for e in events if e['trip_id']==trip_id], key=lambda x:x['timestamp'])
        times=[e['timestamp'] for e in rows]
        assert times==sorted(times)
        seq=[stop_order[rows[0]['route_id']].index(e['next_stop_id']) for e in rows]
        assert all(a<=b for a,b in zip(seq,seq[1:]))


def test_delay_calculation_and_delayed_trips_positive():
    events=read_events(DATA/'raw'/'bus_events.jsonl')
    for e in events:
        a=__import__('datetime').datetime.fromisoformat(e['actual_next_stop_arrival'])
        s=__import__('datetime').datetime.fromisoformat(e['scheduled_next_stop_arrival'])
        assert abs((a-s).total_seconds()/60-e['delay_next_stop_minutes']) < 0.01
    delayed=[e for e in events if e['scenario'] in {'moderately_delayed','severely_delayed'}]
    assert delayed and all(e['delay_next_stop_minutes']>0 for e in delayed)


def test_normal_delays_are_not_identical():
    vals={e['delay_next_stop_minutes'] for e in read_events(DATA/'raw'/'bus_events.jsonl') if e['scenario']=='normal'}
    assert len(vals)>10


def test_future_target_fields_are_not_canonical_realtime_inputs():
    assert not set(GROUND_TRUTH_COLUMNS) & set(CANONICAL_COLUMNS)


def test_only_current_routes_loaded():
    routes,_=load_files(CONFIG,GEOMETRY)
    assert set(routes)=={'R01','R02'}