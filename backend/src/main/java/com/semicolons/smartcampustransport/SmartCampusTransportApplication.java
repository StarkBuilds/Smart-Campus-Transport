package com.semicolons.smartcampustransport;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SmartCampusTransportApplication {

	public static void main(String[] args) {
		SpringApplication.run(SmartCampusTransportApplication.class, args);
	}

}
