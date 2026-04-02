package com.example.tradems.model;


import com.example.tradems.enums.WithdrawalStatus;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "withdrawals")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class WithdrawalEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore // BURA YENİ ƏLAVƏ OLUNDU
    UserEntity user;

    BigDecimal amount;

    String walletAddress;

    @Enumerated(EnumType.STRING)
    WithdrawalStatus status = WithdrawalStatus.PENDING;

    LocalDateTime requestDate = LocalDateTime.now();
    LocalDateTime processedDate;
}
