package com.example.userms.dto.request;


import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RefreshTokenRequest {

    @NotBlank(message = "refreshToken boş ola bilməz")
    private String refreshToken;
}