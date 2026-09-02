package com.example.userms.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
@AllArgsConstructor
@NoArgsConstructor
public class UserUpdateRequest {

    @Email(message = "Email düzgün formatda olmalıdır")
    String newEmail;

    @Size(min = 8, max = 100, message = "Yeni şifrə 8 ilə 100 simvol arasında olmalıdır")
    @Pattern(
            regexp = "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).*$",
            message = "Şifrədə ən azı bir rəqəm, bir kiçik və bir böyük hərf olmalıdır"
    )
    String newPassword;

    @Pattern(
            regexp = "^\\+[1-9]\\d{6,14}$",
            message = "Telefon nömrəsi beynəlxalq formatda olmalıdır (məs: +994501234567)"
    )
    String newPhoneNumber;

    String currentPassword;
}