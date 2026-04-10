package com.example.userms.model;

import com.example.userms.model.enums.NotificationType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "notifications",
        indexes = {
                @Index(name = "idx_notifications_user_created_at", columnList = "user_id, created_at"),
                @Index(name = "idx_notifications_user_is_read", columnList = "user_id, is_read")
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class NotificationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    UUID id;

    @Column(name = "user_id", nullable = false)
    UUID userId;

    @Column(nullable = false, length = 120)
    String title;

    @Column(nullable = false, length = 4000)
    String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    NotificationType type;

    @Column(name = "is_read", nullable = false)
    boolean read;

    @Column(name = "created_by", nullable = false, length = 255)
    String createdBy;

    @Column(name = "created_at", nullable = false)
    LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
