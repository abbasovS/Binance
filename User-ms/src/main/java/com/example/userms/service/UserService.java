package com.example.userms.service;

import com.example.userms.dto.UserRegistrationDto;
import com.example.userms.dto.UserRegistrationEvent;
import com.example.userms.dto.request.GoogleLoginRequest;
import com.example.userms.dto.request.UserUpdateRequest;
import com.example.userms.dto.response.TelegramConnectInitResponse;
import com.example.userms.dto.response.TelegramStatusResponse;
import com.example.userms.dto.response.UserProfileResponse;
import com.example.userms.exception.EmailAlreadyExistsException;
import com.example.userms.exception.PhoneNumberAlreadyExistsException;
import com.example.userms.exception.UserNotFoundException;
import com.example.userms.exception.WrongCodeException;
import com.example.userms.exception.WrongPasswordException;
import com.example.userms.model.UserEntity;
import com.example.userms.repository.UserRepository;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final KafkaTemplate<String, UserRegistrationEvent> kafkaTemplate;
    private final JwtService jwtService;
    private final KafkaTemplate<String, Object> kafkaTemplateObject;

    @Value("${telegram.bot.token:}")
    private String telegramBotToken;

    @Value("${telegram.bot.username}")
    private String telegramBotUsername;

    @Value("${google.client.id}")
    private String googleClientId;

    @Transactional
    public void createUser(UserRegistrationDto dto) {
        String email = dto.getEmail().trim().toLowerCase();
        String normalizedPhone = normalizePhone(dto.getPhoneNumber());

        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException("Email already exists");
        }

        if (userRepository.existsByPhoneNumber(normalizedPhone)) {
            throw new PhoneNumberAlreadyExistsException("Phone number already exists");
        }

        UserEntity user = new UserEntity();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setPhoneNumber(normalizedPhone);
        user.setRole("ROLE_USER");
        user.setActive(true);
        user.setPremium(false);
        user.setEmailVerified(false);

        String code = String.valueOf(new Random().nextInt(900000) + 100000);
        user.setEmailVerificationCode(code);

        try {
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException ex) {
            log.error("Database integrity violation while saving user: {}", email, ex);
            throw new RuntimeException("Məlumat bazasına yazılarkən kritik xəta baş verdi. Sahələri yoxlayın.");
        }

        UserRegistrationEvent event = new UserRegistrationEvent(user.getEmail(), code, user.getPhoneNumber());
        kafkaTemplate.send("registration-topic", event);
        log.info("User created successfully: {}", email);
    }

    @Transactional
    public void verifyEmail(String email, String code) {
        String normalizedEmail = email.trim().toLowerCase();

        UserEntity user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new UserNotFoundException("İstifadəçi tapılmadı"));

        if (code != null && code.equals(user.getEmailVerificationCode())) {
            user.setEmailVerified(true);
            user.setEmailVerificationCode(null);
            userRepository.save(user);
        } else {
            throw new WrongCodeException("Kod yanlışdır!");
        }
    }

    public String login(String email, String password) {
        String normalizedEmail = email.trim().toLowerCase();
        UserEntity user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new RuntimeException("İstifadəçi tapılmadı"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Şifrə yanlışdır");
        }

        if (!user.isEmailVerified()) {
            throw new RuntimeException("Email təsdiqlənməyib");
        }

        if (!user.isActive()) {
            throw new RuntimeException("Sizin hesabınız admin tərəfindən bloklanıb!");
        }

        return jwtService.generateToken(user.getEmail(), user.getRole());
    }

    @Transactional
    public void updateUser(String email, UserUpdateRequest request) {
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new WrongPasswordException("Cari sifre yanlisdir");
        }

        if (request.getNewEmail() != null && !request.getNewEmail().equals(user.getEmail())) {
            String normalizedNewEmail = request.getNewEmail().trim().toLowerCase();
            if (userRepository.existsByEmail(normalizedNewEmail)) {
                throw new EmailAlreadyExistsException("Bu email artıq istifadə olunur!");
            }
            user.setEmail(normalizedNewEmail);
            user.setEmailVerified(false);
        }

        if (request.getNewPhoneNumber() != null) {
            String normalizedPhone = normalizePhone(request.getNewPhoneNumber());
            if (userRepository.existsByPhoneNumber(normalizedPhone)) {
                throw new PhoneNumberAlreadyExistsException("Bu telefon nömrəsi artıq istifadə olunur!");
            }
            user.setPhoneNumber(normalizedPhone);
        }

        if (request.getNewPassword() != null && !request.getNewPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        }

        userRepository.save(user);
        log.info("User updated");
    }

    @Transactional
    public void deleteUser(String email) {
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("not found"));
        user.setActive(false);
        userRepository.save(user);

        kafkaTemplateObject.send("user-status-topic", email + ":INACTIVE");
        log.info("User deleted and Kafka event sent");
    }

    public UserProfileResponse getMyProfile() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("İstifadəçi tapılmadı!"));

        return mapToUserProfileResponse(user);
    }

    @Transactional
    public TelegramStatusResponse connectTelegram(String email, String chatId) {
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        user.setTelegramChatId(chatId.trim());
        userRepository.save(user);

        return TelegramStatusResponse.builder()
                .connected(true)
                .chatId(user.getTelegramChatId())
                .build();
    }

    public TelegramStatusResponse getTelegramStatus(String email) {
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        boolean connected = user.getTelegramChatId() != null && !user.getTelegramChatId().isBlank();

        return TelegramStatusResponse.builder()
                .connected(connected)
                .chatId(user.getTelegramChatId())
                .build();
    }

    @Transactional
    public TelegramConnectInitResponse initTelegramConnection(String email) {
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        String code = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        user.setTelegramConnectCode(code);
        user.setTelegramConnectCodeCreatedAt(LocalDateTime.now());
        userRepository.save(user);

        String connectUrl = "https://t.me/" + telegramBotUsername + "?start=" + code;
        log.info("🔗 Telegram Init: User {} üçün URL yaradıldı: {}", email, connectUrl);

        return TelegramConnectInitResponse.builder()
                .connectUrl(connectUrl)
                .build();
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public void handleTelegramWebhook(Map<String, Object> update) {
        try {
            Map<String, Object> message = (Map<String, Object>) update.get("message");
            if (message == null) {
                return;
            }

            String text = (String) message.get("text");
            if (text == null || !text.startsWith("/start ")) {
                return;
            }

            String code = text.replace("/start ", "").trim();

            Map<String, Object> chat = (Map<String, Object>) message.get("chat");
            String chatId = String.valueOf(chat.get("id"));

            userRepository.findByTelegramConnectCode(code).ifPresent(user -> {
                user.setTelegramChatId(chatId);
                user.setTelegramConnectCode(null);
                user.setTelegramConnectCodeCreatedAt(null);
                userRepository.save(user);
                log.info("✅ WEBHOOK UĞURLU: İstifadəçi {} Telegram-a bağlandı! ChatID: {}", user.getEmail(), chatId);
            });
        } catch (Exception e) {
            log.error("🔥 Webhook xətası", e);
        }
    }

    public TelegramStatusResponse confirmTelegramConnection(String email) {
        return getTelegramStatus(email);
    }

    public List<String> getAllTelegramChatIds() {
        return userRepository.findAllByTelegramChatIdIsNotNull()
                .stream()
                .map(UserEntity::getTelegramChatId)
                .filter(chatId -> chatId != null && !chatId.isBlank())
                .distinct()
                .toList();
    }

    @Transactional
    public void disconnectTelegram(String email) {
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        user.setTelegramChatId(null);
        userRepository.save(user);
    }

    public List<UserProfileResponse> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(this::mapToUserProfileResponse)
                .toList();
    }

    @Transactional
    public void toggleUserStatus(UUID userId, String adminEmail) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("İstifadəçi tapılmadı"));

        if (user.getEmail().equals(adminEmail)) {
            throw new RuntimeException("Öz hesabınızı bloklaya bilməzsiniz!");
        }

        user.setActive(!user.isActive());
        userRepository.save(user);

        String statusAction = user.isActive() ? "ACTIVE" : "INACTIVE";
        kafkaTemplateObject.send("user-status-topic", user.getEmail() + ":" + statusAction);

        log.info("Admin {} tərəfindən {} istifadəçisinin statusu dəyişdirildi.", adminEmail, user.getEmail());
    }

    @Transactional
    public void changeUserRole(UUID userId, String newRole, String adminEmail) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("İstifadəçi tapılmadı"));

        if (user.getEmail().equals(adminEmail)) {
            throw new RuntimeException("Öz rolunuzu dəyişdirə bilməzsiniz!");
        }

        user.setRole(newRole);
        userRepository.save(user);
        log.info("Admin {} tərəfindən {} istifadəçisinə {} rolu verildi.", adminEmail, user.getEmail(), newRole);
    }

    @Transactional
    public void togglePremiumStatus(UUID userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("İstifadəçi tapılmadı"));

        user.setPremium(!user.isPremium());
        userRepository.save(user);
    }

    @Transactional
    public void controlTournament(String action) {
        String normalizedAction = action == null ? "" : action.trim().toLowerCase();

        if (!normalizedAction.equals("start") && !normalizedAction.equals("stop")) {
            throw new RuntimeException("Yalnız 'start' və ya 'stop' əmri qəbul edilir");
        }

        kafkaTemplateObject.send("tournament-control-topic", normalizedAction.toUpperCase());
    }

    @Transactional
    public void toggleTournamentParticipation(UUID userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("İstifadəçi tapılmadı"));

        user.setInTournament(!user.isInTournament());
        userRepository.save(user);
    }

    public String googleLogin(GoogleLoginRequest request) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(),
                    GsonFactory.getDefaultInstance()
            )
                    .setAudience(List.of(googleClientId))
                    .build();

            String googleToken = request.getCredential();
            if (googleToken == null || googleToken.isBlank()) {
                googleToken = request.getIdToken();
            }

            if (googleToken == null || googleToken.isBlank()) {
                throw new RuntimeException("Google credential göndərilməyib");
            }

            GoogleIdToken idToken = verifier.verify(googleToken);
            if (idToken == null) {
                throw new RuntimeException("Google token etibarsızdır");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            String email = payload.getEmail().trim().toLowerCase();

            UserEntity user = userRepository.findByEmail(email)
                    .orElseGet(() -> {
                        UserEntity newUser = new UserEntity();
                        newUser.setEmail(email);
                        newUser.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
                        newUser.setPhoneNumber("google-user-" + UUID.randomUUID());
                        newUser.setRole("ROLE_USER");
                        newUser.setActive(true);
                        newUser.setPremium(false);
                        newUser.setEmailVerified(true);
                        return userRepository.save(newUser);
                    });

            if (!user.isActive()) {
                throw new RuntimeException("Sizin hesabınız admin tərəfindən bloklanıb!");
            }

            return jwtService.generateToken(user.getEmail(), user.getRole());
        } catch (Exception e) {
            log.error("Google login failed", e);
            throw new RuntimeException("Google login zamanı xəta baş verdi");
        }
    }

    private UserProfileResponse mapToUserProfileResponse(UserEntity user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .telegramChatId(user.getTelegramChatId())
                .premium(user.isPremium())
                .inTournament(user.isInTournament())
                .emailVerified(user.isEmailVerified())
                .phoneVerified(user.isPhoneVerified())
                .active(user.isActive())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .build();
    }

    private String normalizePhone(String phoneNumber) {
        if (phoneNumber == null) {
            return null;
        }
        return phoneNumber.replaceAll("\\s+", "").trim();
    }
}
