package com.example.userms.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
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
public class LoginRequest {

    @NotBlank(message = "Email boş ola bilməz")
    @Email(message = "Email düzgün formatda olmalıdır")
    @Size(min = 5, max = 100, message = "Email 5 ilə 100 simvol arasında olmalıdır")
    String email;

    @NotBlank(message = "Şifrə boş ola bilməz")
    @Size(min = 8, max = 100, message = "Şifrə 8 ilə 100 simvol arasında olmalıdır")
    String password;
}