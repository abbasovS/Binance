package com.example.userms.dto.request;

import jakarta.validation.constraints.NotBlank;
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
public class LoginRequest {
    @NotBlank(message = "email boş ola bilməz")
    @Size(min = 2, max = 50, message = "email 8 ilə 50 simvol arasında olmalıdır")
    String email;
    @NotBlank(message = "Şifrə boş ola bilməz")
    @Size(min = 8, message = "Şifrə ən az 8 simvol olmalıdır")
    @Pattern(regexp = "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).*$",
            message = "Şifrədə ən azı bir rəqəm, bir kiçik və bir böyük hərf olmalıdır")
    String password;
}
