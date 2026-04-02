package com.example.newsms.dto;

import com.example.newsms.enums.NewsType;
import com.example.newsms.enums.Sentiment;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class NewsFeedResponse {
    Long id;
    String originalTitle;
    String sourceUrl;
    String sourceName;
    String summaryAz;
    String summaryEn;
    String symbol;
    Sentiment sentiment;
    NewsType type;
    boolean global;
    LocalDateTime createdAt;
}
