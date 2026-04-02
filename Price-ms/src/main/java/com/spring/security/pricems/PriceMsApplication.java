package com.spring.security.pricems;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PriceMsApplication {

    public static void main(String[] args) {

        SpringApplication.run(PriceMsApplication.class, args);
    }

}
