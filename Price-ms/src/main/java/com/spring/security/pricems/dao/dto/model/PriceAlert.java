package com.spring.security.pricems.dao.dto.model;

import com.spring.security.pricems.enums.TargetSide;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Entity
@Table(
        name = "alerts_price",
        indexes = {
                @Index(name = "idx_alerts_user_email", columnList = "user_email"),
                @Index(name = "idx_alerts_symbol", columnList = "symbol"),
                @Index(name = "idx_alerts_triggered", columnList = "is_triggered")
        }
)
@FieldDefaults(level = AccessLevel.PRIVATE)
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PriceAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(nullable = false, length = 20)
    String symbol;

    @Column(name = "target_price", nullable = false)
    Double targetPrice;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    TargetSide side;

    @Column(name = "user_email", nullable = false, length = 100)
    String userEmail;

    @Column(name = "chat_id", nullable = false, length = 100)
    String chatId;

    @Builder.Default
    @Column(name = "is_triggered", nullable = false)
    boolean isTriggered = false;
}