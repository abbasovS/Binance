package com.example.newsms.model;

import com.example.newsms.enums.NewsType;
import com.example.newsms.enums.Sentiment;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;


import static jakarta.persistence.GenerationType.*;

@Data
@Entity
@Table(name = "news")
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Builder
public class NewsEntity {
    @Id
    @GeneratedValue(strategy = IDENTITY)
    Long id;
    String originalTitle;
    String sourceUrl;
    String sourceName;

    String summaryEn;
    String summaryAz;

    String symbol;

    @Enumerated(EnumType.STRING)
    Sentiment sentiment;
    @Enumerated(EnumType.STRING)
    NewsType type;

    @Column(name="is_global")
    boolean global;

    Double priceAtRelease;
    Double priceAfter1h;


    Double priceAfter4h;
    Double impactPercentage;

    @CreationTimestamp
    LocalDateTime createdAt;
    LocalDateTime publishedAt;

    Double aiRating;


}
