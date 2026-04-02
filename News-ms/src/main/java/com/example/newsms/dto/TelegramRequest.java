package com.example.newsms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor

public class TelegramRequest {
    private String chat_id;
    private String text;
    private String parse_mode;
}
