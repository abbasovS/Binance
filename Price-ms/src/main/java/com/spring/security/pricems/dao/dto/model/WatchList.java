package com.spring.security.pricems.dao.dto.model;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.experimental.FieldDefaults;

import static jakarta.persistence.GenerationType.IDENTITY;

@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(
        name = "watchlist",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_watchlist_symbol_user", columnNames = {"symbol", "user_email"})
        },
        indexes = {
                @Index(name = "idx_watchlist_user_email", columnList = "user_email"),
                @Index(name = "idx_watchlist_symbol", columnList = "symbol")
        }
)
@FieldDefaults(level = AccessLevel.PRIVATE)
public class WatchList {

    @Id
    @GeneratedValue(strategy = IDENTITY)
    Long id;

    @Column(nullable = false, length = 20)
    String symbol;

    @Column(name = "user_email", nullable = false, length = 100)
    String userEmail;
}