package com.example.userms.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserRegistrationEvent {
    @NotBlank(message = "email boş ola bilməz")
    @Size(min = 2, max = 50, message = "email 8 ilə 50 simvol arasında olmalıdır")
    String email;

    String code;

    @NotBlank(message = "Telefon nömrəsi boş ola bilməz")
    @Pattern(regexp = "^(\\+994|0)(50|51|55|70|77|99)[2-9][0-9]{6}$",
            message = "Azərbaycan nömrə formatı düzgün deyil")
    String phoneNumber;
}
