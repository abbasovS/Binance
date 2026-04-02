package com.example.tradems.kafka;

import com.example.tradems.enums.ContestStatus;
import com.example.tradems.enums.TradeStatus;
import com.example.tradems.model.ContestEntity;
import com.example.tradems.model.TradeEntity;
import com.example.tradems.repository.ContestRepository;
import com.example.tradems.repository.TradeRepository;
import com.example.tradems.repository.UserRepository;
import com.example.tradems.service.TradeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserStatusListener {

    private final UserRepository userRepository;
    private final TradeService tradeService;
    private final TradeRepository tradeRepository;
    private final ContestRepository contestRepository; // YENİ ƏLAVƏ EDİLDİ

    @KafkaListener(topics = "user-status-topic", groupId = "trade-ms-group")
    public void handleUserStatusChange(String rawMessage) {
        // BUG FİX: JSON Serializer-dən gələn artıq dırnaqları təmizləyirik
        String message = rawMessage.replace("\"", "").trim();
        log.info("Kafka-dan admin əmri gəldi: {}", message);

        String[] parts = message.split(":");
        if(parts.length < 2) return;

        String target = parts[0].trim().toLowerCase(); // Email və ya "global"
        String action = parts[1].trim().toUpperCase();

        // 1. QLOBAL ƏMRLƏR (Turnirin İdarə Olunması)
        if ("global".equals(target)) {
            ContestEntity contest = contestRepository.findById(1L).orElseGet(ContestEntity::new);
            if ("TOURNAMENT_START".equals(action)) {
                contest.setStatus(ContestStatus.ACTIVE);
                contestRepository.save(contest);
                log.info("✅ Qlobal Turnir Başladıldı!");
            } else if ("TOURNAMENT_STOP".equals(action)) {
                contest.setStatus(ContestStatus.LOCKED);
                contestRepository.save(contest);
                tradeService.forceCloseAllTrades(); // Bütün trade-ləri bağla
                log.info("🛑 Qlobal Turnir Dayandırıldı!");
            }
            return;
        }

        // 2. FƏRDİ ƏMRLƏR (İstifadəçi idarəetməsi)
        userRepository.findByEmailIgnoreCase(target).ifPresent(user -> {
            switch(action) {
                case "INACTIVE":
                    log.warn("🚨 BLOKLANMIŞ İSTİFADƏÇİ: Ticarətlər bağlanır! Email: {}", target);
                    user.setActive(false);
                    closeAllUserTrades(user.getId());
                    break;
                case "ACTIVE":
                    user.setActive(true);
                    log.info("✅ İstifadəçi bloku açıldı: {}", target);
                    break;
                case "PREMIUM_ADD":
                    user.setPremium(true);
                    log.info("💎 Premium verildi: {}", target);
                    break;
                case "PREMIUM_REMOVE":
                    user.setPremium(false);
                    log.info("🔻 Premium ləğv edildi: {}", target);
                    break;
                case "ARENA_ADD":
                    String currentMonth = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
                    user.setLastJoinedMonth(currentMonth); // Trade-ms üçün bu turnirə qatılmaq deməkdir
                    log.info("⚔️ Arenaya qatıldı: {}", target);
                    break;
                case "ARENA_REMOVE":
                    user.setLastJoinedMonth("REMOVED");
                    closeAllUserTrades(user.getId()); // Arenadan atılırsa tradeləri qapanır
                    log.info("🚪 Arenadan çıxarıldı: {}", target);
                    break;
            }
            userRepository.save(user);
        });
    }

    private void closeAllUserTrades(Long userId) {
        List<TradeEntity> openTrades = tradeRepository.findByUser_IdAndStatus(userId, TradeStatus.OPEN);
        openTrades.forEach(trade -> {
            try {
                tradeService.closeTradeManually(trade.getId(), userId);
            }
            catch (Exception e) { log.error("Trade bağlana bilmədi: {}", trade.getId()); }
        });

        List<TradeEntity> pendingTrades = tradeRepository.findByUser_IdAndStatus(userId, TradeStatus.PENDING);
        pendingTrades.forEach(trade -> {
            try {
                tradeService.cancelPendingTrade(trade.getId(), userId);
            }
            catch (Exception e) { log.error("Pending trade ləğv edilə bilmədi: {}", trade.getId()); }
        });
    }
}