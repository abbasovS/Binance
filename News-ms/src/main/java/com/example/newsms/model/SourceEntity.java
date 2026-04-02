package com.example.newsms.model;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import static jakarta.persistence.GenerationType.*;

@Entity
@Data
@Table(name = "source_stats")
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Builder
public class SourceEntity {
    @Id
    @GeneratedValue(strategy = IDENTITY)
    Long id;

    String sourceName;

    Double averageImpact;

    @Builder.Default
    Integer newsCount=0;
}
