package com.example.tradems.model;

import com.example.tradems.enums.PositionSide;
import com.example.tradems.enums.TradeStatus;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer; // DÜZƏLDİLDİ
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "traders", indexes = {
        @Index(name = "idx_trade_user_id", columnList = "user_id"),
        @Index(name = "idx_trade_status", columnList = "status"),
        @Index(name = "idx_trade_user_status", columnList = "user_id, status")
})
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TradeEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
     UUID id;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
            @JsonIgnore
    UserEntity user;

     String symbol;


    @Enumerated(EnumType.STRING)
    PositionSide side;

     BigDecimal entryPrice;

     BigDecimal margin;

     Integer leverage;

     BigDecimal liquidationPrice;

     BigDecimal takeProfit;

     BigDecimal stopLoss;

    @Enumerated(EnumType.STRING)
    TradeStatus status;


    @JsonSerialize(using = ToStringSerializer.class)
     BigDecimal pnl;

     LocalDateTime openTime = LocalDateTime.now();

     BigDecimal closePrice;

     LocalDateTime closeTime;

}
