package com.example.userms.service;

import com.example.userms.dto.UserRegistrationDto;
import com.example.userms.dto.UserRegistrationEvent;
import com.example.userms.dto.request.GoogleLoginRequest;
import com.example.userms.dto.response.TelegramConnectInitResponse;
import com.example.userms.dto.response.TelegramStatusResponse;
import com.example.userms.dto.request.UserUpdateRequest;
import com.example.userms.exception.*;
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
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;

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

        // SENIOR DÜZƏLİŞİ 1: Default dəyərləri mütləq set edirik
        user.setRole("ROLE_USER");
        user.setActive(true);
        user.setPremium(false);
        user.setEmailVerified(false);

        String code = String.valueOf(new Random().nextInt(900000) + 100000);
        user.setEmailVerificationCode(code);

        try {
            userRepository.saveAndFlush(user);
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            // SENIOR DÜZƏLİŞİ 2: Birbaşa Baza xətasını tuturuq
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
        try {
            String normalizedEmail = email.trim().toLowerCase();
            UserEntity user = userRepository.findByEmail(normalizedEmail)
                    .orElseThrow(() -> new RuntimeException("İstifadəçi tapılmadı"));

            if (!passwordEncoder.matches(password, user.getPassword())) {
                throw new RuntimeException("Şifrə yanlışdır");
            }

            if (!user.isEmailVerified()) {
                throw new RuntimeException("Email təsdiqlənməyib");
            }

            // --- YENİ ƏLAVƏ EDİLƏN HİSSƏ (BLOKLANMA YOXLAMASI) ---
            if (!user.isActive()) {
                throw new RuntimeException("Sizin hesabınız admin tərəfindən bloklanıb!");
            }
            // ------------------------------------------------------

            return jwtService.generateToken(user.getEmail(), user.getRole());
        } catch (Exception e) {
            e.printStackTrace();
            throw e;
        }
    }


@Transactional
    public void updateUser(String email,  UserUpdateRequest request) {
        UserEntity user=userRepository.findByEmail(email)
                .orElseThrow(()-> new UserNotFoundException("not found"));

        if(!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())){
            throw new WrongPasswordException("Cari sifre yanlisdir");
        }
        if (request.getNewEmail() != null && !request.getNewEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getNewEmail())) {
                throw new EmailAlreadyExistsException("Bu email artıq istifadə olunur!");
            }
            user.setEmail(request.getNewEmail());
            user.setEmailVerified(false);
        }

        if (request.getNewPhoneNumber() != null) {
            if (userRepository.existsByPhoneNumber(request.getNewPhoneNumber())) {
                throw new PhoneNumberAlreadyExistsException("Bu telefon nömrəsi artıq istifadə olunur!");
            }
            user.setPhoneNumber(request.getNewPhoneNumber());
        }

        if (request.getNewPassword() != null) {
            user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        }
        userRepository.save(user);

        log.info("User updated");

    }
    @Transactional
    public void deleteUser(String email) {
        UserEntity user = userRepository.findByEmail(email).orElseThrow(() -> new UserNotFoundException("not found"));
        user.setActive(false);
        userRepository.save(user);

        kafkaTemplateObject.send("user-status-topic", email + ":INACTIVE");

        log.info("User deleted and Kafka event sent");
    }


    public UserEntity getMyProfile() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("İstifadəçi tapılmadı!"));
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
    public void handleTelegramWebhook(Map<String, Object> update) {
        try {
            Map<String, Object> message = (Map<String, Object>) update.get("message");
            if (message == null) return;

            String text = (String) message.get("text");
            if (text == null || !text.startsWith("/start ")) return;

            // Kodu text-dən ayırırıq
            String code = text.replace("/start ", "").trim();

            Map<String, Object> chat = (Map<String, Object>) message.get("chat");
            String chatId = String.valueOf(chat.get("id"));

            // Kodu bazada axtarırıq və istifadəçini dərhal bağlayırıq
            userRepository.findByTelegramConnectCode(code).ifPresent(user -> {
                user.setTelegramChatId(chatId);
                user.setTelegramConnectCode(null); // Kodu istifadə etdik deyə silirik
                user.setTelegramConnectCodeCreatedAt(null);
                userRepository.save(user);
                log.info("✅ WEBHOOK UĞURLU: İstifadəçi {} Telegram-a bağlandı! ChatID: {}", user.getEmail(), chatId);
            });
        } catch (Exception e) {
            log.error("🔥 Webhook xətası: {}", e.getMessage());
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

    public List<UserEntity> getAllUsers() {
        return userRepository.findAll();
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

        // KAFKA EVENT (Aktiv və İnaktiv olmasını Trade-ms-ə bildiririk)
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
        log.info("Admin {} tərəfindən {} istifadəçisinə {} rolu verildi.",
                adminEmail, user.getEmail(), newRole);
    }

    @Transactional
    public void togglePremiumStatus(UUID userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("İstifadəçi tapılmadı"));

        user.setPremium(!user.isPremium());
        userRepository.save(user);

        // KAFKA EVENT
        String action = user.isPremium() ? "PREMIUM_ADD" : "PREMIUM_REMOVE";
        kafkaTemplateObject.send("user-status-topic", user.getEmail() + ":" + action);
    }
    @Transactional
    public void controlTournament(String action) {
        if ("start".equalsIgnoreCase(action)) {
            log.info("🏆 ADMIN ƏMRİ: Qlobal Paper Trading Turniri Başladıldı!");
            kafkaTemplateObject.send("user-status-topic", "GLOBAL:TOURNAMENT_START");
        } else if ("stop".equalsIgnoreCase(action)) {
            log.info("🛑 ADMIN ƏMRİ: Qlobal Paper Trading Turniri Donduruldu / Bitirildi!");
            kafkaTemplateObject.send("user-status-topic", "GLOBAL:TOURNAMENT_STOP");
        } else {
            throw new IllegalArgumentException("Naməlum əmr: " + action);
        }
    }



    @Transactional
    public void toggleTournamentParticipation(UUID userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("İstifadəçi tapılmadı"));
        user.setInTournament(!user.isInTournament());
        userRepository.save(user);

        String action = user.isInTournament() ? "ARENA_ADD" : "ARENA_REMOVE";
        kafkaTemplateObject.send("user-status-topic", user.getEmail() + ":" + action);
    }

    private String normalizePhone(String phone) {
        if (phone == null) return null;

        String cleaned = phone.replaceAll("\\s+", "");

        if (!cleaned.startsWith("+")) {
            cleaned = "+" + cleaned;
        }

        return cleaned;
    }
    public String googleLogin(GoogleLoginRequest request) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(), new GsonFactory())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken idToken = verifier.verify(request.getIdToken());

            if (idToken != null) {
                GoogleIdToken.Payload payload = idToken.getPayload();
                String email = payload.getEmail().toLowerCase();

                UserEntity user = userRepository.findByEmail(email).orElse(null);

                if (user == null) {
                    // YENİ İSTİFADƏÇİ (SIGN UP)
                    user = new UserEntity();
                    user.setEmail(email);
                    user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString())); // Random şifrə
                    user.setRole("ROLE_USER");
                    user.setActive(true);
                    user.setPremium(false);
                    user.setEmailVerified(true); // Google onsuz da təsdiqlidir
                    userRepository.save(user);
                } else if (!user.isActive()) {
                    // BLOKLANMIŞ İSTİFADƏÇİ YOXLAMASI
                    throw new RuntimeException("Sizin hesabınız admin tərəfindən bloklanıb!");
                }

                // JWT Token yaradırıq (Sənin sistemində login() necə işləyirsə, eynisi)
                return jwtService.generateToken(user.getEmail(), user.getRole());

            } else {
                throw new RuntimeException("Invalid Google token!");
            }
        } catch (Exception e) {
            log.error("Google authentication failed", e);
            throw new RuntimeException("Google authentication failed!");
        }
    }

}
