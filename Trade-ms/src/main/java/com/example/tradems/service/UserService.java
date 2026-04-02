package com.example.tradems.service;

import com.example.tradems.client.PriceClient;
import com.example.tradems.enums.ContestStatus;
import com.example.tradems.enums.PositionSide;
import com.example.tradems.enums.TradeStatus;
import com.example.tradems.enums.UserRank;
import com.example.tradems.exception.UserNotFoundException;
import com.example.tradems.model.ContestEntity;
import com.example.tradems.model.TradeEntity;
import com.example.tradems.model.UserEntity;
import com.example.tradems.repository.ContestRepository;
import com.example.tradems.repository.TradeRepository;
import com.example.tradems.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {
    private final UserRepository userRepository;
    private final ContestRepository contestRepository;
    private final TradeRepository tradeRepository;
    private final PriceClient priceClient;

    @Transactional
    public UserEntity createUser(String username, String email, boolean isPremium) {
        String currentMonth = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        String normalizedEmail = email.toLowerCase().trim();
        String checkUsername = username.trim();

        ContestEntity contest = contestRepository.findById(1L).orElseThrow(
                () -> new RuntimeException("Yarışma obyekti tapılmadı!")
        );

        Optional<UserEntity> userOpt = userRepository.findByEmail(normalizedEmail);

        if (userOpt.isPresent()) {
            UserEntity user = userOpt.get();

            // Əgər istifadəçi artıq bu ay qeydiyyatdan keçibsə
            if (currentMonth.equals(user.getLastJoinedMonth())) {
                if (isPremium && !user.isPremium()) {
                    if (contest.getStatus() != ContestStatus.REGISTRATION) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                                "Yarışma artıq başlayıb, qeydiyyat bağlıdır! Növbəti ayı gözləyin.");
                    }
                    user.setPremium(true);
                }
                return userRepository.save(user);
            }

            if (contest.getStatus() != ContestStatus.REGISTRATION) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Qeydiyyat yalnız ayın 1-i ilə 5-i arasında açıqdır! Növbəti ayı gözləyin.");
            }

            if (!user.getUsername().equalsIgnoreCase(checkUsername) &&
                    userRepository.existsByUsernameIgnoreCase(checkUsername)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already taken!");
            }


            tradeRepository.deleteAllByUser_Id(user.getId());

            user.setUsername(checkUsername);
            user.setVirtualBalance(BigDecimal.valueOf(10000));
            user.setFrozenBalance(BigDecimal.ZERO);
            user.setLastJoinedMonth(currentMonth);
            user.setPremium(isPremium);

            return userRepository.save(user);
        }

        if (contest.getStatus() != ContestStatus.REGISTRATION) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Qeydiyyat yalnız ayın 1-i ilə 5-i arasında açıqdır! Növbəti ayı gözləyin.");
        }

        if (userRepository.existsByUsernameIgnoreCase(checkUsername)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already taken!");
        }

        UserEntity newUser = new UserEntity();
        newUser.setEmail(normalizedEmail);
        newUser.setUsername(checkUsername);
        newUser.setVirtualBalance(BigDecimal.valueOf(10000));
        newUser.setFrozenBalance(BigDecimal.ZERO);
        newUser.setLastJoinedMonth(currentMonth);
        newUser.setUserRank(UserRank.ROOKIE);
        newUser.setPremium(isPremium);

        return userRepository.save(newUser);
    }

    public UserEntity getUserById(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new UserNotFoundException("User not found"));
    }

    public Optional<UserEntity> getUserByEmail(String email) {
        if (email == null || email.isBlank()) {
            return Optional.empty();
        }
        return userRepository.findByEmailIgnoreCase(email.trim());
    }

    @Transactional
    public void updateUserBalance(Long userId, BigDecimal amount) {
        UserEntity user = getUserById(userId);
        user.setVirtualBalance(user.getVirtualBalance().add(amount));
        userRepository.save(user);
    }

    @Transactional
    public void resetBalances() {
        userRepository.resetAllBalances();
    }

    public List<UserEntity> getLeaderboard() {
        String currentMonth = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        List<UserEntity> users = userRepository.findByLastJoinedMonth(currentMonth);
        users.removeIf(u -> !u.isActive());

        if (users.isEmpty()) {
            return users;
        }

        BigDecimal initialBalance = new BigDecimal("10000");

        List<Long> userIds = users.stream().map(UserEntity::getId).toList();

        List<TradeEntity> allOpenTrades = tradeRepository.findByUser_IdInAndStatus(userIds, TradeStatus.OPEN);
        List<TradeEntity> allClosedTrades = tradeRepository.findByUser_IdInAndStatusInOrderByCloseTimeDesc(
                userIds, List.of(TradeStatus.CLOSED)
        );

        java.util.Map<Long, List<TradeEntity>> openTradesMap = allOpenTrades.stream()
                .collect(java.util.stream.Collectors.groupingBy(t -> t.getUser().getId()));

        java.util.Map<Long, List<TradeEntity>> closedTradesMap = allClosedTrades.stream()
                .collect(java.util.stream.Collectors.groupingBy(t -> t.getUser().getId()));

        // --- YENİ ƏLAVƏ: Yalnız unikal coinlərin qiymətini 1 dəfə çəkirik ---
        java.util.Set<String> uniqueSymbols = allOpenTrades.stream()
                .map(TradeEntity::getSymbol)
                .collect(java.util.stream.Collectors.toSet());

        java.util.Map<String, BigDecimal> currentPricesMap = new java.util.HashMap<>();
        for (String sym : uniqueSymbols) {
            try {
                Double rawPrice = priceClient.getRealtimePrice(sym);
                if (rawPrice != null && rawPrice > 0) {
                    currentPricesMap.put(sym, BigDecimal.valueOf(rawPrice));
                }
            } catch (Exception ignored) {}
        }
        // ---------------------------------------------------------------------

        for (UserEntity user : users) {
            Long uid = user.getId();
            BigDecimal equity = user.getVirtualBalance() != null ? user.getVirtualBalance() : BigDecimal.ZERO;

            if (user.getFrozenBalance() != null) {
                equity = equity.add(user.getFrozenBalance());
            }

            List<TradeEntity> userOpenTrades = openTradesMap.getOrDefault(uid, java.util.Collections.emptyList());

            for (TradeEntity trade : userOpenTrades) {
                equity = equity.add(trade.getMargin());

                try {
                    BigDecimal currentPrice = currentPricesMap.get(trade.getSymbol());

                    if (currentPrice != null) {
                        if (trade.getEntryPrice() != null && trade.getEntryPrice().compareTo(BigDecimal.ZERO) > 0) {
                            BigDecimal diff = (trade.getSide() == PositionSide.LONG)
                                    ? currentPrice.subtract(trade.getEntryPrice())
                                    : trade.getEntryPrice().subtract(currentPrice);

                            BigDecimal pnl = diff.divide(trade.getEntryPrice(), 8, java.math.RoundingMode.HALF_UP)
                                    .multiply(trade.getMargin())
                                    .multiply(new BigDecimal(trade.getLeverage()));

                            if (pnl.compareTo(trade.getMargin().negate()) < 0) {
                                pnl = trade.getMargin().negate();
                            }
                            equity = equity.add(pnl);
                        }
                    }
                } catch (Exception ignored) {
                }
            }
            user.setEquity(equity);

            try {
                BigDecimal roiCalc = equity.subtract(initialBalance)
                        .divide(initialBalance, 4, java.math.RoundingMode.HALF_UP)
                        .multiply(new BigDecimal("100"));
                user.setRoi(roiCalc.doubleValue());
            } catch (Exception e) {
                user.setRoi(0.0);
            }

            List<TradeEntity> userClosedTrades = closedTradesMap.getOrDefault(uid, java.util.Collections.emptyList());

            if (!userClosedTrades.isEmpty()) {
                long wins = userClosedTrades.stream()
                        .filter(t -> t.getPnl() != null && t.getPnl().compareTo(BigDecimal.ZERO) > 0)
                        .count();
                double wr = ((double) wins / userClosedTrades.size()) * 100.0;
                user.setWinRate(wr);
            } else {
                user.setWinRate(0.0);
            }
        }

        users.sort((u1, u2) -> {
            BigDecimal eq1 = u1.getEquity() != null ? u1.getEquity() : BigDecimal.ZERO;
            BigDecimal eq2 = u2.getEquity() != null ? u2.getEquity() : BigDecimal.ZERO;
            return eq2.compareTo(eq1);
        });

        return users;
    }
    @Scheduled(fixedRate = 60000)
    @CacheEvict(value = "leaderboard", allEntries = true)
    public void clearLeaderboardCache() {
        log.info("Leaderboard keşi təmizləndi");
    }
}