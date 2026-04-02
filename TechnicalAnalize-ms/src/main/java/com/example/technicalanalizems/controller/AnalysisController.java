package com.example.technicalanalizems.controller;

import com.example.technicalanalizems.service.TelegramBotService;
import com.example.technicalanalizems.service.AnalysisEngine;
import com.example.technicalanalizems.service.TechnicalAnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/analysis")
@RequiredArgsConstructor
public class AnalysisController {

    private final AnalysisEngine analysisEngine;
    private final TechnicalAnalysisService analysisService;
    private final TelegramBotService telegramBotService;

    @PostMapping("/generate")
    @ResponseBody
    public ResponseEntity<Map<String, String>> getAnalysis(@RequestParam String symbol) {
        try {
            List<List<Object>> rawData = analysisService.fetchRawData(symbol);
            byte[] imageBytes = analysisEngine.generateChart(symbol, rawData);
            String base64Image = Base64.getEncoder().encodeToString(imageBytes);

            Map<String, String> response = new HashMap<>();
            response.put("symbol", symbol.toUpperCase());
            response.put("chart", base64Image);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping("/send-telegram")
    public String sendToTelegram(@RequestParam String symbol, @RequestParam String base64Image) {
        byte[] imageBytes = Base64.getDecoder().decode(base64Image);

        String caption = "📊 <b>" + symbol.toUpperCase() + "</b> - Smart Money (SMC) & ICT Analizi \n\n" +
                "<i>Bu qrafik AI tərəfindən avtomatik generasiya edilmişdir.</i>";

        telegramBotService.sendImageToAll(imageBytes, caption);

        return "redirect:/analysis/dashboard?symbol=" + symbol;
    }
}