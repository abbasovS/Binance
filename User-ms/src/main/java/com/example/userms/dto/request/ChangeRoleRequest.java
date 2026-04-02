package com.example.userms.dto.request;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;

@Data
public class ChangeRoleRequest {
    @NotBlank
    private String role;
}