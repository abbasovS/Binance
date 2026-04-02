package com.example.userms.service;

import com.example.userms.dto.UserRegistrationEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {
    private final JavaMailSender mailSender;

    @KafkaListener(topics = "registration-topic", groupId = "notif-group")
    public void handleRegistrationEvent(UserRegistrationEvent event) {
        log.info("Kafka mesajı alındı: {}", event.getEmail());


        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(event.getEmail());
        message.setSubject("Hesab Təsdiqləmə");
        message.setText("Sizin təsdiq kodunuz: " + event.getCode());

        try {
            mailSender.send(message);
            log.info("Email uğurla göndərildi: {}", event.getEmail());
        } catch (Exception e) {
            log.error("Email göndərmədə xəta: {}", e.getMessage());
        }
}}
