package com.example.userms.controller;

import com.example.userms.exception.UnauthorizedException;
import com.example.userms.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/telegram")
@RequiredArgsConstructor
@Slf4j
public class TelegramWebHookController {

    private final UserService userService;

        private static final String TELEGRAM_SECRET_HEADER = "X-Telegram-Bot-Api-Secret-Token";
        @Value("${telegram.webhook.secret:}")
        private String telegramWebhookSecret;

        @PostMapping("/webhook")
        public ResponseEntity<Void> webhook(
                @RequestHeader(value = TELEGRAM_SECRET_HEADER, required = false) String secretHeader,
                @RequestBody Map<String, Object> update
        ) {
            if (telegramWebhookSecret == null || telegramWebhookSecret.isBlank()) {
                log.error("Telegram webhook secret is not configured");
                throw new UnauthorizedException("Webhook secret is not configured");
            }

            if (!telegramWebhookSecret.equals(secretHeader)) {
                log.warn("Invalid Telegram webhook secret");
                throw new UnauthorizedException("Invalid webhook secret");
            }

            log.debug("Telegram webhook received");
            userService.handleTelegramWebhook(update);
            return ResponseEntity.ok().build();
        }
    }
