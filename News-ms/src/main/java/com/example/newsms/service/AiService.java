package com.example.newsms.service;

import com.example.newsms.dto.AiAnalysisResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class AiService {

    @Value("${ai.api.key:}")
    private String openAiApiKey;

    @Value("${ai.api.url:}")
    private String openAiApiUrl;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public AiAnalysisResponse analyze(String title) {
        try {
            if (openAiApiKey == null || openAiApiKey.isEmpty() || openAiApiKey.contains("your-openai-api-key")) {
                log.warn("Real OpenAI API Key not found! Using fallback for: {}", title);
                return fallbackResponse(title);
            }
            return callRealAi(title);
        } catch (Exception e) {
            log.error("AI Analysis failed! Using fallback. Error: {}", e.getMessage());
            return fallbackResponse(title);
        }
    }

    private AiAnalysisResponse callRealAi(String title) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(openAiApiKey);

        String prompt = String.format(
                "You are an expert Wall Street cryptocurrency and macroeconomic analyst. " +
                        "Analyze the following news headline: '%s'.\n\n" +
                        "Provide a highly concise and actionable summary for investors. " +
                        "Your summary MUST include:\n" +
                        "1. Core Fact: What happened?\n" +
                        "2. Market Impact: How and why might this affect prices, liquidity, or market sentiment?\n\n" +
                        "RULES:\n" +
                        "- Write ONLY in English.\n" +
                        "- Keep it strictly under 3 sentences. No fluff.\n" +
                        "- Use professional financial terminology.\n\n" +
                        "Return ONLY a clean JSON object with this exact structure (no markdown, no extra text):\n" +
                        "{\n" +
                        "  \"symbol\": \"Ticker symbol of the main asset (e.g., BTC, SOL). Use 'MARKET' if general.\",\n" +
                        "  \"sentiment\": \"BULLISH, BEARISH, or NEUTRAL\",\n" +
                        "  \"summary\": \"The core fact + market impact analysis in English.\",\n" +
                        "  \"newsType\": \"GLOBAL_MARKET, MACRO_FED, MACRO_TRUMP, or PORTFOLIO\"\n" +
                        "}", title
        );

        Map<String, Object> message = new HashMap<>();
        message.put("role", "user");
        message.put("content", prompt);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", "llama-3.1-8b-instant");
        requestBody.put("messages", List.of(message));
        requestBody.put("temperature", 0.1);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(openAiApiUrl, request, String.class);

        JsonNode rootNode = objectMapper.readTree(response.getBody());
        String content = rootNode.path("choices").get(0).path("message").path("content").asText();

        int startIndex = content.indexOf('{');
        int endIndex = content.lastIndexOf('}');
        if (startIndex != -1 && endIndex != -1) {
            content = content.substring(startIndex, endIndex + 1);
        }

        JsonNode aiResult = objectMapper.readTree(content);

        String newsType = aiResult.path("newsType").asText("GLOBAL_MARKET");
        boolean isGlobal = "GLOBAL_MARKET".equals(newsType) || newsType.startsWith("MACRO_");
        String finalSummary = aiResult.path("summary").asText("No summary provided.");

        log.info("AI Analysis Success: Sentiment={}, Symbol={}", aiResult.path("sentiment").asText(), aiResult.path("symbol").asText());

        return AiAnalysisResponse.builder()
                .symbol(aiResult.path("symbol").asText("MARKET"))
                .sentiment(aiResult.path("sentiment").asText("NEUTRAL"))
                .summaryEn(finalSummary)
                .summaryAz(finalSummary)
                .newsType(newsType)
                .aiRating(8.5)
                .isGlobal(isGlobal)
                .build();
    }

    public AiAnalysisResponse fallbackResponse(String title) {
        String cleanTitle = title != null && title.length() > 120 ? title.substring(0, 117) + "..." : title;
        String fallbackSummary = String.format("Fact: %s. \nMarket Impact: Currently, the direct market impact is unconfirmed, but analysts advise monitoring the asset for short-term volatility.", cleanTitle);

        return AiAnalysisResponse.builder()
                .symbol("MARKET")
                .summaryAz(fallbackSummary)
                .summaryEn(fallbackSummary)
                .sentiment("NEUTRAL")
                .newsType("GLOBAL_MARKET")
                .aiRating(5.0)
                .isGlobal(true)
                .build();
    }

    public List<AiAnalysisResponse> analyzeBatch(List<String> titles) {
        try {
            if (openAiApiKey == null || openAiApiKey.isEmpty() ||
                    openAiApiKey.contains("your-openai-api-key")) {
                return titles.stream()
                        .map(this::fallbackResponse)
                        .collect(Collectors.toList());
            }
            return callRealAiBatch(titles);
        } catch (Exception e) {
            log.error("Batch AI Analysis failed: {}", e.getMessage());
            return titles.stream()
                    .map(this::fallbackResponse)
                    .collect(Collectors.toList());
        }
    }

    private List<AiAnalysisResponse> callRealAiBatch(List<String> titles) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(openAiApiKey);

        StringBuilder titlesText = new StringBuilder();
        for (int i = 0; i < titles.size(); i++) {
            titlesText.append(i + 1).append(". ").append(titles.get(i)).append("\n");
        }

        String prompt = String.format(
                "Analyze these %d crypto/financial news headlines. " +
                        "Return ONLY a JSON array, one object per headline, same order:\n\n" +
                        "%s\n\n" +
                        "Each object must have:\n" +
                        "{ \"symbol\": \"BTC/ETH/MARKET/etc\", " +
                        "\"sentiment\": \"BULLISH/BEARISH/NEUTRAL\", " +
                        "\"summary\": \"2 sentence analysis\", " +
                        "\"newsType\": \"GLOBAL_MARKET/MACRO_FED/MACRO_TRUMP/PORTFOLIO\" }\n\n" +
                        "Return ONLY the JSON array, no markdown, no extra text.",
                titles.size(), titlesText
        );

        Map<String, Object> message = new HashMap<>();
        message.put("role", "user");
        message.put("content", prompt);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", "llama-3.1-8b-instant");
        requestBody.put("messages", List.of(message));
        requestBody.put("temperature", 0.1);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(
                openAiApiUrl, request, String.class);

        JsonNode rootNode = objectMapper.readTree(response.getBody());
        String content = rootNode.path("choices").get(0)
                .path("message").path("content").asText();

        // DÜZƏLİŞ 2: Batch (Array) JSON məlumatları üçün [...] mötərizələrinin kəsilməsi
        int startIndex = content.indexOf('[');
        int endIndex = content.lastIndexOf(']');
        if (startIndex != -1 && endIndex != -1) {
            content = content.substring(startIndex, endIndex + 1);
        }

        JsonNode resultsArray = objectMapper.readTree(content);

        List<AiAnalysisResponse> responses = new ArrayList<>();
        for (int i = 0; i < titles.size(); i++) {
            JsonNode item = i < resultsArray.size() ?
                    resultsArray.get(i) : objectMapper.createObjectNode();

            String newsType = item.path("newsType").asText("GLOBAL_MARKET");
            boolean isGlobal = "GLOBAL_MARKET".equals(newsType) ||
                    newsType.startsWith("MACRO_");

            responses.add(AiAnalysisResponse.builder()
                    .symbol(item.path("symbol").asText("MARKET"))
                    .sentiment(item.path("sentiment").asText("NEUTRAL"))
                    .summaryEn(item.path("summary").asText(titles.get(i)))
                    .summaryAz(item.path("summary").asText(titles.get(i)))
                    .newsType(newsType)
                    .aiRating(8.5)
                    .isGlobal(isGlobal)
                    .build());
        }
        return responses;
    }
}