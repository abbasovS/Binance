package com.example.tradems.service;

import com.example.tradems.dto.request.WithdrawRequestDto;
import com.example.tradems.enums.WithdrawalStatus;
import com.example.tradems.model.UserEntity;
import com.example.tradems.model.WithdrawalEntity;
import com.example.tradems.repository.UserRepository;
import com.example.tradems.repository.WithdrawalRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class WithdrawalService {

    private final WithdrawalRepository withdrawalRepository;
    private final UserRepository userRepository;

    @Transactional
    public WithdrawalEntity requestWithdrawal(String email, WithdrawRequestDto request) {
        // TƏHLÜKƏSİZLİK 1: Mənfi və ya sıfır məbləğləri bloklayırıq!
        if (request.amount() == null || request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Çıxarış məbləği 0-dan böyük olmalıdır!");
        }

        // TƏHLÜKƏSİZLİK 2: Double-Spending (İkiqat xərc) hücumunun qarşısını almaq üçün Lock!
        UserEntity unLockedUser = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("İstifadəçi tapılmadı!"));

        UserEntity user = userRepository.findByIdWithLock(unLockedUser.getId())
                .orElseThrow(() -> new RuntimeException("İstifadəçi tapılmadı!"));

        BigDecimal currentRealBalance = user.getRealRewardBalance() != null ? user.getRealRewardBalance() : BigDecimal.ZERO;

        if (currentRealBalance.compareTo(request.amount()) < 0) {
            throw new RuntimeException("Kifayət qədər real mükafat balansınız yoxdur! Cari balans: " + currentRealBalance);
        }

        // Pulu dərhal balansdan silirik
        user.setRealRewardBalance(currentRealBalance.subtract(request.amount()));
        userRepository.save(user);

        // Sorğunu qeyd edirik
        WithdrawalEntity withdrawal = new WithdrawalEntity();
        withdrawal.setUser(user);
        withdrawal.setAmount(request.amount());
        withdrawal.setWalletAddress(request.walletAddress());
        withdrawal.setStatus(WithdrawalStatus.PENDING);
        withdrawal.setRequestDate(LocalDateTime.now());

        log.info("YENİ ÇIXARIŞ SORĞUSU: İstifadəçi {} {} USDT çıxarmaq istəyir. Cüzdan: {}",
                user.getUsername(), request.amount(), request.walletAddress());

        return withdrawalRepository.save(withdrawal);
    }

    public List<WithdrawalEntity> getMyWithdrawals(String email) {
        UserEntity user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("İstifadəçi tapılmadı!"));
        return withdrawalRepository.findAllByUserIdOrderByRequestDateDesc(user.getId());
    }

    public BigDecimal getMyRealBalance(String email) {
        UserEntity user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("İstifadəçi tapılmadı!"));
        return user.getRealRewardBalance() != null ? user.getRealRewardBalance() : BigDecimal.ZERO;
    }
}