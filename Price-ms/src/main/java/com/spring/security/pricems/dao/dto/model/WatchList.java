package com.spring.security.pricems.dao.dto.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import static jakarta.persistence.GenerationType.IDENTITY;
@Data
@Table(name = "watchlist")
@Entity
@FieldDefaults(level = AccessLevel.PRIVATE)
public class WatchList {
    @Id
    @GeneratedValue(strategy = IDENTITY)
    Long id;
    String symbol;
    String userEmail;
}
