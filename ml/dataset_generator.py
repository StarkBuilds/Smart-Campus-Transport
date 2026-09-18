#!/usr/bin/env python3
"""CampusRide synthetic raw telemetry generator.

Member 2: Synthetic Dataset Generation and Delay Labeling.
Uses only the precomputed R01/R02 route geometry; no routing/geocoding calls.
"""
from __future__ import annotations
import argparse, json, math, random
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

CANONICAL_COLUMNS = ["bus_id","route_id","trip_id","timestamp","latitude","longitude","bearing","speed_kmh","accuracy_m","status","next_stop_id"]
GROUND_TRUTH_COLUMNS = ["scheduled_next_stop_arrival","actual_next_stop_arrival","delay_next_stop_minutes","scenario"]
ALLOWED_ROUTES = {"R01","R02"}

@dataclass(frozen=True)
class GeneratorConfig:
    n_buses: int = 12
    trips_per_bus_per_day: int = 2
    trip_dates: tuple[str,...] = ("2026-08-03","2026-08-04","2026-08-05","2026-08-06","2026-08-07")
    gps_interval_seconds: int = 15
    vehicle_speed_kmh: float = 25.0
    stop_dwell_seconds: float = 22.0
    seed: int = 42
    target_records: int = 25000
    imperfect_rate: float = 0.012


def hav(a,b,c,d):
    r=6371.0088; p1=math.radians(a); p2=math.radians(c); dp=math.radians(c-a); dl=math.radians(d-b)
    x=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*r*math.asin(min(1,math.sqrt(x)))

def bearing(a,b,c,d):
    p1,p2=math.radians(a),math.radians(c); dl=math.radians(d-b)
    y=math.sin(dl)*math.cos(p2); x=math.cos(p1)*math.sin(p2)-math.sin(p1)*math.cos(p2)*math.cos(dl)
    return (math.degrees(math.atan2(y,x))+360)%360

def load_files(config_path, geometry_path):
    cfg=json.loads(Path(config_path).read_text(encoding='utf-8'))
    geo=json.loads(Path(geometry_path).read_text(encoding='utf-8'))
    routes={r['route_id']:r for r in cfg['routes'] if r['route_id'] in ALLOWED_ROUTES}
    geometries={r['route_id']:r for r in geo['routes'] if r['route_id'] in ALLOWED_ROUTES}
    if set(routes)!=ALLOWED_ROUTES or set(geometries)!=ALLOWED_ROUTES:
        raise ValueError('Generator requires exactly current routes R01 and R02 in config and geometry')
    return routes, geometries

def build_polyline(route):
    pts=[]
    for seg in route['segments']:
        coords=seg['geometry']['coordinates']
        if not coords: continue
        for i,(lon,lat) in enumerate(coords):
            if pts and abs(pts[-1][0]-lon)<1e-12 and abs(pts[-1][1]-lat)<1e-12: continue
            pts.append((float(lon),float(lat)))
    # cumulative geographic distance along actual stored road geometry
    cum=[0.0]
    for (lon1,lat1),(lon2,lat2) in zip(pts,pts[1:]):
        cum.append(cum[-1]+hav(lat1,lon1,lat2,lon2))
    return pts,cum

def interpolate(pts,cum,dist):
    if dist<=0: lon,lat=pts[0]; return lat,lon
    if dist>=cum[-1]: lon,lat=pts[-1]; return lat,lon
    lo,hi=0,len(cum)-1
    while lo<hi:
        mid=(lo+hi)//2
        if cum[mid]<dist: lo=mid+1
        else: hi=mid
    i=max(1,lo); span=cum[i]-cum[i-1]; f=0 if span<=0 else (dist-cum[i-1])/span
    lon=pts[i-1][0]+f*(pts[i][0]-pts[i-1][0]); lat=pts[i-1][1]+f*(pts[i][1]-pts[i-1][1])
    return lat,lon

def classify(start_hour, rng):
    # Deterministic scenario mix with explicit peak/off-peak coverage.
    u=rng.random()
    if u < 0.10:
        return 'severely_delayed'
    if u < 0.25:
        return 'moderately_delayed'
    if (7 <= start_hour < 10 or 16 <= start_hour < 19) and u < 0.55:
        return 'rush'
    return 'normal'

def scenario_factors(s, rng):
    if s=='normal': return rng.uniform(0.92,1.08), rng.uniform(18,28)
    if s=='rush': return rng.uniform(0.72,0.88), rng.uniform(25,38)
    if s=='moderately_delayed': return rng.uniform(0.70,0.86), rng.uniform(30,48)
    return rng.uniform(0.52,0.72), rng.uniform(38,65)

def make_trip(route_id, route_cfg, route_geo, bus_id, trip_id, date_s, start_hour, cfg, rng):
    pts,cum=build_polyline(route_geo)
    # Convert stored waypoint distances to normalized positions on the actual polyline.
    wp=[w for w in route_geo['waypoints'] if w['waypoint_type'] in ('START','STOP')]
    stops=[w for w in wp if w['waypoint_type']=='STOP']
    route_end=float(route_geo['route_length_km'])
    scale=route_end/cum[-1] if cum[-1] else 1
    stop_dist=[min(route_end,float(w['cumulative_distance_km'])) for w in stops]
    scenario=classify(start_hour,rng)
    speed_factor,max_speed=scenario_factors(scenario,rng)
    scheduled_start=datetime.fromisoformat(date_s+'T%02d:%02d:00+00:00'%(start_hour,rng.choice([0,15,30,45])))
    scheduled_arr=[]; actual_arr=[]
    t_sched=scheduled_start; t_actual=scheduled_start
    prev=0.0
    for sd in stop_dist:
        seg=sd-prev; travel=seg/max(cfg.vehicle_speed_kmh,1e-6)*3600
        t_sched += timedelta(seconds=travel)
        t_sched += timedelta(seconds=cfg.stop_dwell_seconds)
        scheduled_arr.append(t_sched)
        # Scenario speed and per-segment stochasticity create non-identical normal delays.
        local_factor=max(0.45,min(1.15,speed_factor*rng.uniform(0.90,1.10)))
        actual_speed=max(10.0,min(max_speed,cfg.vehicle_speed_kmh*local_factor))
        t_actual += timedelta(seconds=seg/actual_speed*3600)
        dwell=max(10.0,rng.gauss(cfg.stop_dwell_seconds*(1.0 if scenario=='normal' else 1.5 if scenario=='rush' else 1.8),5.0))
        t_actual += timedelta(seconds=dwell)
        actual_arr.append(t_actual)
        prev=sd
    # GPS samples from route start to final stop arrival.
    end_t=actual_arr[-1]
    events=[]; t=scheduled_start; dist=0.0
    # Precompute actual stop times and route progress by time using segment travel + dwell simulation again from actual arrivals.
    # We create a piecewise schedule from sampled segment arrival times; interpolate progress between actual stop arrivals.
    actual_stop_times=actual_arr
    prev_t=scheduled_start; prev_d=0.0
    segments=[]
    for i,at in enumerate(actual_stop_times):
        sd=stop_dist[i]
        segments.append((prev_t,at,prev_d,sd))
        prev_t=at; prev_d=sd
    while t<=end_t:
        # determine route progress from actual timing; during dwell, hold at stop.
        d=route_end
        for st,et,d0,d1 in segments:
            if t<=et:
                total=(et-st).total_seconds()
                f=0 if total<=0 else min(1,max(0,(t-st).total_seconds()/total))
                d=d0+(d1-d0)*f
                break
        # next stop strictly ahead; if at a stop, choose that stop until it is reached, then next stop.
        idx=next((i for i,sd in enumerate(stop_dist) if sd>d+0.001),len(stop_dist)-1)
        if d>=stop_dist[-1]-0.001: idx=len(stop_dist)-1
        next_id=stops[idx]['point_id'] if stops else None
        lat,lon=interpolate(pts,cum,d/scale if scale else d)
        # road-following GPS jitter, kept small and deterministic.
        lat += rng.gauss(0,0.000025); lon += rng.gauss(0,0.000025)
        if events:
            prev_e=events[-1]
            spd=max(0,min(65, hav(prev_e['latitude'],prev_e['longitude'],lat,lon)/(cfg.gps_interval_seconds/3600)))
            br=bearing(prev_e['latitude'],prev_e['longitude'],lat,lon)
        else:
            lat2,lon2=interpolate(pts,cum,min(cum[-1],max(0,0.02))/scale if scale else 0.02)
            spd=max(0,min(65,cfg.vehicle_speed_kmh*speed_factor*rng.uniform(0.90,1.10)))
            br=bearing(lat,lon,lat2,lon2)
        sched=scheduled_arr[idx]; act=actual_arr[idx]
        delay=(act-sched).total_seconds()/60
        status='AT_STOP' if any(abs((t-at).total_seconds())<cfg.gps_interval_seconds/2 for at in actual_arr) else ('DELAYED' if delay>2 else 'IN_SERVICE')
        if status=='AT_STOP': spd=0.0
        ev={'bus_id':bus_id,'route_id':route_id,'trip_id':trip_id,'timestamp':t.astimezone(timezone.utc).isoformat(),'latitude':round(lat,7),'longitude':round(lon,7),'bearing':round(br,2),'speed_kmh':round(spd,2),'accuracy_m':round(max(2,rng.gauss(7,2)),2),'status':status,'next_stop_id':next_id,
            'scheduled_next_stop_arrival':sched.astimezone(timezone.utc).isoformat(),'actual_next_stop_arrival':act.astimezone(timezone.utc).isoformat(),'delay_next_stop_minutes':round(delay,3),'scenario':scenario}
        events.append(ev); t+=timedelta(seconds=cfg.gps_interval_seconds)
    # ensure final arrival record
    if not events or events[-1]['timestamp']!=end_t.isoformat():
        i=len(stops)-1; lat,lon=interpolate(pts,cum,stop_dist[-1]/scale if scale else stop_dist[-1]); events.append({'bus_id':bus_id,'route_id':route_id,'trip_id':trip_id,'timestamp':end_t.astimezone(timezone.utc).isoformat(),'latitude':round(lat,7),'longitude':round(lon,7),'bearing':events[-1]['bearing'] if events else 0.0,'speed_kmh':0.0,'accuracy_m':round(max(2,rng.gauss(6,1.5)),2),'status':'AT_STOP','next_stop_id':stops[-1]['point_id'],'scheduled_next_stop_arrival':scheduled_arr[-1].isoformat(),'actual_next_stop_arrival':actual_arr[-1].isoformat(),'delay_next_stop_minutes':round((actual_arr[-1]-scheduled_arr[-1]).total_seconds()/60,3),'scenario':scenario})
    return events, {'scenario':scenario,'scheduled_arrivals':scheduled_arr,'actual_arrivals':actual_arr}

def inject_imperfections(events,cfg,rng):
    n=max(1,int(len(events)*cfg.imperfect_rate)); picks=rng.sample(range(len(events)),n)
    kinds=['duplicate','stale','invalid_coord','missing_optional','unrealistic_speed','unknown_stop']
    for j,idx in enumerate(picks):
        e=events[idx]; kind=kinds[j%len(kinds)]
        if kind=='duplicate': events.append(dict(e))
        elif kind=='stale': e['timestamp']=(datetime.fromisoformat(e['timestamp'])-timedelta(minutes=6)).isoformat()
        elif kind=='invalid_coord': e['latitude']=95.0
        elif kind=='missing_optional': e['accuracy_m']=None
        elif kind=='unrealistic_speed': e['speed_kmh']=180.0
        elif kind=='unknown_stop': e['next_stop_id']='UNKNOWN_STOP'
    return kinds,n

def generate(config_path,geometry_path,out_path,report_path,cfg):
    routes,geos=load_files(config_path,geometry_path); rng=random.Random(cfg.seed)
    events=[]; trip_meta=[]; bus_i=0
    # Deterministic round-robin routes, dates and times.
    starts=[7,9,14,17]
    for date_s in cfg.trip_dates:
        for bus_num in range(1,cfg.n_buses+1):
            bus_id=f'BUS_{bus_num:03d}'
            for trip_no in range(1,cfg.trips_per_bus_per_day+1):
                route_id='R01' if (bus_num+trip_no+cfg.trip_dates.index(date_s))%2 else 'R02'
                sh=starts[(bus_num+trip_no+cfg.trip_dates.index(date_s))%len(starts)]
                trip_id=f'TRIP_{bus_id}_{date_s.replace("-","")}_{trip_no:02d}'
                ev,meta=make_trip(route_id,routes[route_id],geos[route_id],bus_id,trip_id,date_s,sh,cfg,rng)
                events.extend(ev); trip_meta.append((trip_id,route_id,meta['scenario']))
    # Increase/decrease deterministically around target using complete trips, never partial rows.
    events.sort(key=lambda e:(e['timestamp'],e['bus_id'],e['trip_id']))
    if len(events)>cfg.target_records:
        # Keep all rows from selected whole trips until target is approached, then retain earliest whole trips.
        chosen=[]; count=0
        for trip_id in sorted({e['trip_id'] for e in events}):
            rows=[e for e in events if e['trip_id']==trip_id]
            if count+len(rows)<=cfg.target_records: chosen.extend(rows); count+=len(rows)
        events=chosen
    kinds,bad=inject_imperfections(events,cfg,rng)
    Path(out_path).parent.mkdir(parents=True,exist_ok=True)
    with open(out_path,'w',encoding='utf-8') as f:
        for e in events: f.write(json.dumps(e,separators=(',',':'))+'\n')
    valid=[e for e in events if -90<=e['latitude']<=90 and -180<=e['longitude']<=180 and 0<=e['speed_kmh']<=126 and e['route_id'] in ALLOWED_ROUTES and e['next_stop_id'] and not e['next_stop_id'].startswith('UNKNOWN')]
    delays=[e['delay_next_stop_minutes'] for e in valid]
    dist={s:sum(1 for _,_,x in trip_meta if x==s) for s in ['normal','rush','moderately_delayed','severely_delayed']}
    report={'generator':'CampusRide Member 2 synthetic dataset generator','seed':cfg.seed,'config':asdict(cfg),'routes':sorted(ALLOWED_ROUTES),'bus_count':cfg.n_buses,'trip_count':len(trip_meta),'raw_records':len(events),'valid_candidate_records':len(valid),'invalid_or_imperfect_records':len(events)-len(valid),'route_distribution':{r:sum(1 for e in events if e['route_id']==r) for r in sorted(ALLOWED_ROUTES)},'scenario_trip_distribution':dist,'delay_minutes':{'min':round(min(delays),3),'mean':round(sum(delays)/len(delays),3),'median':round(sorted(delays)[len(delays)//2],3),'max':round(max(delays),3)} if delays else {},'controlled_imperfection_count':bad,'controlled_imperfection_types':kinds,'ground_truth_columns':GROUND_TRUTH_COLUMNS,'canonical_columns':CANONICAL_COLUMNS,'note':'Ground-truth/target fields are retained for labeling/audit and must not be used as realtime model inputs.'}
    Path(report_path).write_text(json.dumps(report,indent=2),encoding='utf-8')
    return report

def main():
    root=Path(__file__).resolve().parent
    ap=argparse.ArgumentParser(); ap.add_argument('--config',default=str(root/'data/processed/route_config.json')); ap.add_argument('--geometry',default=str(root/'data/processed/route_geometry.json')); ap.add_argument('--output',default=str(root/'data/raw/bus_events.jsonl')); ap.add_argument('--report',default=str(root/'data/processed/dataset_generation_report.json')); ap.add_argument('--seed',type=int,default=42); args=ap.parse_args()
    cfg=GeneratorConfig(seed=args.seed)
    report=generate(args.config,args.geometry,args.output,args.report,cfg)
    print(json.dumps(report,indent=2))
if __name__=='__main__': main()