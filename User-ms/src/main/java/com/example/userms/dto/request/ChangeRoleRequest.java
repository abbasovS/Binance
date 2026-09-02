package com.example.userms.dto.request;

import jakarta.validation.constraints.Pattern;
import lombok.Data;
import jakarta.validation.constraints.NotBlank;

@Data
public class ChangeRoleRequest {
    @NotBlank
    @Pattern(
            regexp = "^ROLE_(USER|ADMIN|PREMIUM)$",
            message = "Yalnız ROLE_USER, ROLE_ADMIN və ROLE_PREMIUM qəbul edilir"
    )
    private String role;
}