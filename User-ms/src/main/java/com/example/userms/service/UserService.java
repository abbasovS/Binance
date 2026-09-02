package com.example.userms.service;

import com.example.userms.dto.UserRegistrationDto;
import com.example.userms.dto.UserRegistrationEvent;
import com.example.userms.dto.request.GoogleLoginRequest;
import com.example.userms.dto.request.UserUpdateRequest;
import com.example.userms.dto.response.*;
import com.example.userms.exception.BadRequestException;
import com.example.userms.exception.EmailAlreadyExistsException;
import com.example.userms.exception.ForbiddenOperationException;
import com.example.userms.exception.PhoneNumberAlreadyExistsException;
import com.example.userms.exception.UnauthorizedException;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import java.security.MessageDigest;
import java.util.HexFormat;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
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


    @Value("${telegram.bot.username}")
    private String telegramBotUsername;

    @Value("${google.client.id}")
    private String googleClientId;

    @Value("${app.telegram.connect-code-ttl-minutes:10}")
    private long telegramConnectCodeTtlMinutes;

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
        user.setPassword(passwordEncoder.encode(dto.getPassword().trim()));
        user.setPhoneNumber(normalizedPhone);
        user.setRole("ROLE_USER");
        user.setActive(true);
        user.setPremium(false);
        user.setInTournament(false);
        user.setEmailVerified(false);
        user.setPhoneVerified(false);
        user.setTokenVersion(0);

        String code = String.valueOf(new Random().nextInt(900000) + 100000);
        user.setEmailVerificationCode(code);

        try {
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException ex) {
            log.error("Database integrity violation while saving user: {}", email, ex);

            String rootMessage = ex.getMostSpecificCause() != null
                    ? ex.getMostSpecificCause().getMessage()
                    : ex.getMessage();

            String normalizedMessage = rootMessage == null ? "" : rootMessage.toLowerCase();

            if (normalizedMessage.contains("email")) {
                throw new EmailAlreadyExistsException("Email already exists");
            }

            if (normalizedMessage.contains("phone")) {
                throw new PhoneNumberAlreadyExistsException("Phone number already exists");
            }

            throw new BadRequestException("Bu email və ya telefon nömrəsi artıq mövcuddur");
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
            return;
        }

        throw new WrongCodeException("Kod yanlışdır!");
    }

    @Transactional
    public AuthResponse login(String email, String password) {
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            throw new UnauthorizedException("Email və ya şifrə yanlışdır");
        }

        String normalizedEmail = email.trim().toLowerCase();

        UserEntity user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new UnauthorizedException("Email və ya şifrə yanlışdır"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new UnauthorizedException("Email və ya şifrə yanlışdır");
        }

        if (!user.isEmailVerified()) {
            throw new ForbiddenOperationException("Email təsdiqlənməyib");
        }

        if (!user.isActive()) {
            throw new ForbiddenOperationException("Sizin hesabınız admin tərəfindən bloklanıb!");
        }

        return issueTokens(user);
    }

    @Transactional
    public void updateUser(String email, UserUpdateRequest request) {
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("İstifadəçi tapılmadı"));

        boolean isGoogleStyleUser =
                user.getPhoneNumber() != null && user.getPhoneNumber().startsWith("+999");

        if (!isGoogleStyleUser) {
            if (request.getCurrentPassword() == null || request.getCurrentPassword().isBlank()) {
                throw new WrongPasswordException("Cari şifrə boş ola bilməz");
            }

            if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
                throw new WrongPasswordException("Cari şifrə yanlışdır");
            }
        }

        if (request.getNewEmail() != null && !request.getNewEmail().isBlank()) {
            String normalizedNewEmail = request.getNewEmail().trim().toLowerCase();

            if (!normalizedNewEmail.equals(user.getEmail()) && userRepository.existsByEmail(normalizedNewEmail)) {
                throw new EmailAlreadyExistsException("Bu email artıq istifadə olunur!");
            }

            if (!normalizedNewEmail.equals(user.getEmail())) {
                String code = String.valueOf(new Random().nextInt(900000) + 100000);

                user.setEmail(normalizedNewEmail);
                user.setEmailVerified(false);
                user.setEmailVerificationCode(code);

                UserRegistrationEvent event =
                        new UserRegistrationEvent(user.getEmail(), code, user.getPhoneNumber());
                kafkaTemplate.send("registration-topic", event);
            }
        }

        if (request.getNewPhoneNumber() != null && !request.getNewPhoneNumber().isBlank()) {
            String normalizedPhone = normalizePhone(request.getNewPhoneNumber());

            if (!normalizedPhone.equals(user.getPhoneNumber()) && userRepository.existsByPhoneNumber(normalizedPhone)) {
                throw new PhoneNumberAlreadyExistsException("Bu telefon nömrəsi artıq istifadə olunur!");
            }

            user.setPhoneNumber(normalizedPhone);
        }

        if (request.getNewPassword() != null && !request.getNewPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getNewPassword()));
            user.setTokenVersion(user.getTokenVersion() + 1);
        }

        userRepository.save(user);
        log.info("User updated: {}", email);
    }

    @Transactional
    public void deleteUser(String email) {
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("İstifadəçi tapılmadı"));

        user.setActive(false);
        user.setRefreshTokenHash(null);
        user.setRefreshTokenExpiry(null);
        user.setTokenVersion(user.getTokenVersion() + 1);
        userRepository.save(user);

        kafkaTemplateObject.send("user-status-topic", email + ":INACTIVE");
        log.info("User deactivated and Kafka event sent: {}", email);
    }

    public UserProfileResponse getMyProfile() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("İstifadəçi tapılmadı!"));

        return mapToUserProfileResponse(user);
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
        log.info("Telegram connect URL generated for user={}", email);

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
                log.debug("Telegram webhook ignored: no message payload");
                return;
            }

            String text = (String) message.get("text");
            if (text == null || !text.startsWith("/start ")) {
                log.debug("Telegram webhook ignored: unsupported message text");
                return;
            }

            String code = text.replace("/start ", "").trim();
            if (code.length() < 6 || code.length() > 64) {
                log.warn("Telegram webhook ignored: invalid code length");
                return;
            }

            Map<String, Object> chat = (Map<String, Object>) message.get("chat");
            if (chat == null || chat.get("id") == null) {
                log.warn("Telegram webhook missing chat id");
                return;
            }

            String chatId = String.valueOf(chat.get("id"));

            userRepository.findByTelegramConnectCode(code).ifPresentOrElse(user -> {
                if (isTelegramConnectCodeExpired(user.getTelegramConnectCodeCreatedAt())) {
                    log.warn("Expired telegram connect code used for user={}", user.getEmail());
                    user.setTelegramConnectCode(null);
                    user.setTelegramConnectCodeCreatedAt(null);
                    userRepository.save(user);
                    return;
                }

                user.setTelegramChatId(chatId);
                user.setTelegramConnectCode(null);
                user.setTelegramConnectCodeCreatedAt(null);
                userRepository.save(user);

                log.info("User {} connected Telegram successfully. chatId={}", user.getEmail(), chatId);
            }, () -> log.warn("Telegram connect attempted with unknown/used code"));
        } catch (Exception e) {
            log.error("Telegram webhook processing failed", e);
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
        user.setTelegramConnectCode(null);
        user.setTelegramConnectCodeCreatedAt(null);
        userRepository.save(user);
    }

    public PagedResponse<UserProfileResponse> getAllUsers(int page, int size) {
        int validatedPage = Math.max(page, 0);
        int validatedSize = Math.min(Math.max(size, 1), 100);

        Pageable pageable = PageRequest.of(
                validatedPage,
                validatedSize,
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        Page<UserEntity> userPage = userRepository.findAll(pageable);

        return PagedResponse.<UserProfileResponse>builder()
                .content(userPage.getContent().stream().map(this::mapToUserProfileResponse).toList())
                .page(userPage.getNumber())
                .size(userPage.getSize())
                .totalElements(userPage.getTotalElements())
                .totalPages(userPage.getTotalPages())
                .last(userPage.isLast())
                .build();
    }

    @Transactional
    public void toggleUserStatus(UUID userId, String adminEmail) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("İstifadəçi tapılmadı"));

        if (user.getEmail().equalsIgnoreCase(adminEmail)) {
            throw new ForbiddenOperationException("Öz hesabınızı bloklaya bilməzsiniz!");
        }

        boolean newActiveStatus = !user.isActive();
        user.setActive(newActiveStatus);

        if (!newActiveStatus) {
            user.setRefreshTokenHash(null);
            user.setRefreshTokenExpiry(null);
            user.setTokenVersion(user.getTokenVersion() + 1);
        }

        userRepository.save(user);

        String statusAction = user.isActive() ? "ACTIVE" : "INACTIVE";
        kafkaTemplateObject.send("user-status-topic", user.getEmail() + ":" + statusAction);

        log.info("Admin {} changed status of user {}", adminEmail, user.getEmail());
    }

    @Transactional
    public void changeUserRole(UUID userId, String newRole, String adminEmail) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("İstifadəçi tapılmadı"));

        if (user.getEmail().equalsIgnoreCase(adminEmail)) {
            throw new ForbiddenOperationException("Öz rolunuzu dəyişdirə bilməzsiniz!");
        }

        String normalizedRole = newRole == null ? "" : newRole.trim().toUpperCase();

        if (!List.of("ROLE_USER", "ROLE_ADMIN", "ROLE_PREMIUM").contains(normalizedRole)) {
            throw new BadRequestException("Yalnız ROLE_USER, ROLE_ADMIN və ROLE_PREMIUM qəbul edilir");
        }

        user.setRole(normalizedRole);
        userRepository.save(user);

        log.info("Admin {} changed role of user {} to {}", adminEmail, user.getEmail(), normalizedRole);
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
            throw new BadRequestException("Yalnız 'start' və ya 'stop' əmri qəbul edilir");
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

    public AuthResponse googleLogin(GoogleLoginRequest request) {
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
                throw new BadRequestException("Google credential göndərilməyib");
            }

            GoogleIdToken idToken = verifier.verify(googleToken);
            if (idToken == null) {
                throw new UnauthorizedException("Google token etibarsızdır");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();

            String issuer = payload.getIssuer();
            if (!"accounts.google.com".equals(issuer) && !"https://accounts.google.com".equals(issuer)) {
                throw new UnauthorizedException("Google issuer etibarsızdır");
            }

            if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
                throw new ForbiddenOperationException("Google email təsdiqlənməyib");
            }

            String email = payload.getEmail().trim().toLowerCase();

            UserEntity user = userRepository.findByEmail(email)
                    .orElseGet(() -> {
                        UserEntity newUser = new UserEntity();
                        newUser.setEmail(email);
                        newUser.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
                        newUser.setPhoneNumber(buildGooglePlaceholderPhone());
                        newUser.setRole("ROLE_USER");
                        newUser.setActive(true);
                        newUser.setPremium(false);
                        newUser.setInTournament(false);
                        newUser.setEmailVerified(true);
                        newUser.setPhoneVerified(false);
                        newUser.setTokenVersion(0);
                        return userRepository.saveAndFlush(newUser);
                    });

            if (!user.isActive()) {
                throw new ForbiddenOperationException("Sizin hesabınız admin tərəfindən bloklanıb!");
            }

            return issueTokens(user);
        } catch (UnauthorizedException | BadRequestException | ForbiddenOperationException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Google login failed", ex);
            throw new UnauthorizedException("Google login uğursuz oldu");
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
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    private String normalizePhone(String phoneNumber) {
        if (phoneNumber == null) {
            throw new BadRequestException("Telefon nömrəsi boş ola bilməz");
        }

        String normalized = phoneNumber.trim().replaceAll("\\s+", "");
        if (!normalized.matches("^\\+[1-9]\\d{6,14}$")) {
            throw new BadRequestException("Telefon nömrəsi beynəlxalq formatda olmalıdır (məs: +994501234567)");
        }

        return normalized;
    }

    private boolean isTelegramConnectCodeExpired(LocalDateTime createdAt) {
        if (createdAt == null) {
            return true;
        }

        long ageInMinutes = ChronoUnit.MINUTES.between(createdAt, LocalDateTime.now());
        return ageInMinutes >= telegramConnectCodeTtlMinutes;
    }

    @Transactional
    public AuthResponse refreshToken(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new UnauthorizedException("Refresh token göndərilməyib");
        }

        String tokenType;
        try {
            tokenType = jwtService.extractTokenType(rawRefreshToken);
        } catch (Exception ex) {
            throw new UnauthorizedException("Refresh token etibarsızdır");
        }

        if (!"refresh".equals(tokenType)) {
            throw new UnauthorizedException("Yanlış token tipi göndərildi");
        }

        String email;
        try {
            email = jwtService.extractUsername(rawRefreshToken);
        } catch (Exception ex) {
            throw new UnauthorizedException("Refresh token etibarsızdır");
        }

        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("Refresh token etibarsızdır"));

        if (!user.isActive()) {
            throw new ForbiddenOperationException("Sizin hesabınız admin tərəfindən bloklanıb!");
        }

        if (user.getRefreshTokenHash() == null || user.getRefreshTokenExpiry() == null) {
            throw new UnauthorizedException("Refresh token etibarsızdır");
        }

        if (user.getRefreshTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new UnauthorizedException("Refresh token vaxtı bitib");
        }

        if (!sha256(rawRefreshToken).equals(user.getRefreshTokenHash())) {
            throw new UnauthorizedException("Refresh token etibarsızdır");
        }

        if (!jwtService.isTokenValid(rawRefreshToken, buildSecurityUser(user), user.getTokenVersion())) {
            throw new UnauthorizedException("Refresh token etibarsızdır");
        }

        return issueTokens(user);
    }
    @Transactional
    public void logout(String email) {
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("İstifadəçi tapılmadı"));

        user.setRefreshTokenHash(null);
        user.setRefreshTokenExpiry(null);
        user.setTokenVersion(user.getTokenVersion() + 1);
        userRepository.save(user);
    }

    private org.springframework.security.core.userdetails.User buildSecurityUser(UserEntity user) {
        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                user.isActive(),
                true,
                true,
                true,
                List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority(user.getRole()))
        );
    }

    private AuthResponse issueTokens(UserEntity user) {
        String accessToken = jwtService.generateAccessToken(user.getEmail(), user.getRole(), user.getTokenVersion());
        String refreshToken = jwtService.generateRefreshToken(user.getEmail(), user.getTokenVersion());

        user.setRefreshTokenHash(sha256(refreshToken));  // BCrypt əvəzinə SHA-256
        user.setRefreshTokenExpiry(jwtService.getRefreshExpiryDateTime());
        userRepository.save(user);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .build();
    }


    private String buildGooglePlaceholderPhone() {
        String value = "+999" + UUID.randomUUID().toString().replace("-", "").substring(0, 9);
        if (userRepository.existsByPhoneNumber(value)) {
            return buildGooglePlaceholderPhone();
        }
        return value;
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 hash xətası", e);
        }
}}
