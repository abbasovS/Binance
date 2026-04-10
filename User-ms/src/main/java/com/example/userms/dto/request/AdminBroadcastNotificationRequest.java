package com.example.userms.dto.request;


import com.example.userms.model.enums.NotificationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AdminBroadcastNotificationRequest {

    @NotBlank(message = "Title boş ola bilməz")
    @Size(max = 120, message = "Title maksimum 120 simvol ola bilər")
    private String title;

    @NotBlank(message = "Message boş ola bilməz")
    @Size(max = 4000, message = "Message maksimum 4000 simvol ola bilər")
    private String message;

    @NotNull(message = "Type boş ola bilməz")
    private NotificationType type = NotificationType.INFO;


    private boolean alsoPublishAsGlobalMessage = false;
}