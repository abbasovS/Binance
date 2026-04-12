package com.example.userms.controller;

import com.example.userms.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/telegram")
@RequiredArgsConstructor
@Slf4j
public class TelegramWebHookController {

    private final UserService userService;

    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(@RequestBody Map<String, Object> update) {
        log.debug("Telegram webhook received");
        userService.handleTelegramWebhook(update);
        return ResponseEntity.ok().build();
    }
}