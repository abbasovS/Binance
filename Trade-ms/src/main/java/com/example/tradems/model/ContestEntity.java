package com.example.tradems.model;

import com.example.tradems.enums.ContestStatus;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@Entity
@Table(name = "contest")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ContestEntity {

    @Id
    Long id = 1L;

    @Enumerated(EnumType.STRING)
    ContestStatus status = ContestStatus.REGISTRATION;

    String currentMonth;
}