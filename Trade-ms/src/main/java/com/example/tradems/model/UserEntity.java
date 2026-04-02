package com.example.tradems.model;

import com.example.tradems.enums.UserRank;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;
@Data
@Entity
@Table(name = "users", indexes = {
        @Index(name = "idx_user_email", columnList = "email", unique = true),
        @Index(name = "idx_user_username", columnList = "username", unique = true)
})
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserEntity {
@Id
@GeneratedValue(strategy = GenerationType.IDENTITY)
Long id;
String username;
String email;
BigDecimal frozenBalance=BigDecimal.ZERO;
BigDecimal virtualBalance=BigDecimal.ZERO;
@Enumerated(EnumType.STRING)
UserRank userRank;
boolean premium=false;
LocalDateTime subscriptionEndDate;
String lastJoinedMonth;
    @Column(nullable = false)
    boolean active = true;
    @Transient
    BigDecimal equity = BigDecimal.ZERO;

BigDecimal realRewardBalance = BigDecimal.ZERO;

    @Column(name = "terms_accepted_at")
    private LocalDateTime termsAcceptedAt;

    @Transient
    Double roi = 0.0;

    @Transient
    Double winRate = 0.0;
}
