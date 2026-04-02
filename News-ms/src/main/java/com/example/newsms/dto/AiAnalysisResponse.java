package com.example.newsms.dto;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Builder
public class AiAnalysisResponse {
    String symbol;
    String summaryEn;
    String summaryAz;
    String sentiment;
    Double aiRating;
    boolean isGlobal;
    String newsType;
}
