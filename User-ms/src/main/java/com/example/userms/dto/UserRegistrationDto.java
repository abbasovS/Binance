package com.example.userms.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserRegistrationDto {

    @NotBlank(message = "Email boş ola bilməz")
    @Size(min = 5, max = 50, message = "Email 5 ilə 50 simvol arasında olmalıdır")
    String email;

    @NotBlank(message = "Şifrə boş ola bilməz")
    @Size(min = 8, message = "Şifrə ən az 8 simvol olmalıdır")
    @Pattern(regexp = "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).*$",
            message = "Şifrədə ən azı bir rəqəm, bir kiçik və bir böyük hərf olmalıdır")
    String password;

    @NotBlank(message = "Telefon nömrəsi boş ola bilməz")
    // YENİ: Beynəlxalq standartlara (E.164) uyğun Regex: + işarəsi və arxasınca 7-dən 15-ə qədər rəqəm
    @Pattern(regexp = "^\\+[1-9]\\d{6,14}$",
            message = "Telefon nömrəsi beynəlxalq formatda olmalıdır (məs: +994501234567)")
    String phoneNumber;
}