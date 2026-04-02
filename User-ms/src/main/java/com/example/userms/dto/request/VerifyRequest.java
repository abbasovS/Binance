package com.example.userms.dto.request;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;

@Data
public class VerifyRequest {
    @NotBlank
    private String email;
    @NotBlank
    private String code;
}