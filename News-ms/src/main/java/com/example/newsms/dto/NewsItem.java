package com.example.newsms.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class NewsItem {
    private String title;
    private String url;

    @JsonProperty("created_at")
    private String createdAt;

    @JsonProperty("source")
    private Source sourceInfo;

    private String domain;

    public String getSourceName() {
        return sourceInfo != null ? sourceInfo.getTitle() : "Unknown";
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Source {
        private String title;
    }
}
