package com.example.tradems.scheduled;

import com.example.tradems.dto.response.ContestStatusResponse;
import com.example.tradems.enums.ContestStatus;
import com.example.tradems.model.ContestEntity;
import com.example.tradems.model.UserEntity;
import com.example.tradems.repository.ContestRepository;
import com.example.tradems.repository.UserRepository;
import com.example.tradems.service.TradeService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContestManagerService {

    private final ContestRepository contestRepository;
    private final UserRepository userRepository;
    private final TradeService tradeService;

    // Proqram işə düşəndə vəziyyəti AVTOMATİK hesablayır və yeniləyir
    @PostConstruct
    public void initContest() {
        // Bazada varsa onu gətirir, yoxdursa yenisini yaradır
        ContestEntity contest = contestRepository.findById(1L).orElseGet(() -> {
            ContestEntity newContest = new ContestEntity();
            newContest.setId(1L);
            return newContest;
        });

        // Cari günə uyğun statusu HƏMİŞƏ məcburi təyin edir
        int day = LocalDate.now().getDayOfMonth();
        if (day >= 1 && day <= 5) {
            contest.setStatus(ContestStatus.REGISTRATION);
        } else if (day >= 6 && day <= 27) {
            contest.setStatus(ContestStatus.ACTIVE);
        } else {
            contest.setStatus(ContestStatus.LOCKED);
        }

        contest.setCurrentMonth(LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM")));
        contestRepository.save(contest);

        log.info("Yarışma sistemi inisializasiya edildi. Hazırki status: {}", contest.getStatus());
    }

    // Hər gecə 00:00-da işə düşür və vəziyyəti yoxlayır
    @Scheduled(cron = "0 0 0 * * ?", zone = "Asia/Baku")
    @Transactional
    public void dailyContestCheck() {
        LocalDate today = LocalDate.now();
        int dayOfMonth = today.getDayOfMonth();
        ContestEntity contest = contestRepository.findById(1L).orElseThrow();

        // Bug Fix: `== 6` əvəzinə aralıq veririk ki, hansısa gün server sönülü qalsa, məntiq qırılmasın.
        if (dayOfMonth >= 1 && dayOfMonth <= 5 && contest.getStatus() != ContestStatus.REGISTRATION) {
            log.info("YENİ AY: Qeydiyyat mərhələsi başladı!");
            contest.setStatus(ContestStatus.REGISTRATION);
            contest.setCurrentMonth(today.format(DateTimeFormatter.ofPattern("yyyy-MM")));
            contestRepository.save(contest);
        }
        else if (dayOfMonth >= 6 && dayOfMonth <= 27 && contest.getStatus() != ContestStatus.ACTIVE) {
            log.info("YARIŞMA BAŞLADI: Bütün istifadəçilər eyni anda trade edə bilər!");
            contest.setStatus(ContestStatus.ACTIVE);
            contestRepository.save(contest);
        }
        else if (dayOfMonth >= 28 && contest.getStatus() != ContestStatus.LOCKED) {
            log.info("YARIŞMA BİTDİ: Ticarət dayandırılır, qaliblər elan edilir!");
            lockContestAndAwardWinners(contest);
        }
    }

    private void lockContestAndAwardWinners(ContestEntity contest) {
        tradeService.forceCloseAllTrades();

        userRepository.flush();

        List<UserEntity> winners = userRepository.findTop3ByPremiumTrueOrderByVirtualBalanceDesc();

        if (winners.size() > 0) awardUser(winners.get(0), new BigDecimal("100")); // 1-ci yer
        if (winners.size() > 1) awardUser(winners.get(1), new BigDecimal("50"));  // 2-ci yer
        if (winners.size() > 2) awardUser(winners.get(2), new BigDecimal("25"));  // 3-cü yer

        userRepository.removeAllPremiumStatus();

        contest.setStatus(ContestStatus.LOCKED);
        contestRepository.save(contest);
    }


    public ContestStatusResponse getCurrentContestStatus() {
        ContestEntity contest = contestRepository.findById(1L).orElseThrow(() -> new RuntimeException("Yarışma tapılmadı"));

        ZoneId bakuZone = ZoneId.of("Asia/Baku");
        ZonedDateTime now = ZonedDateTime.now(bakuZone);
        YearMonth currentMonth = YearMonth.from(now);

        ZonedDateTime targetDate;
        String message;

        if (contest.getStatus() == ContestStatus.REGISTRATION) {
            targetDate = currentMonth.atDay(5).atTime(23, 59, 59).atZone(bakuZone);
            message = "TIME UNTIL START:";
        }
        else if (contest.getStatus() == ContestStatus.ACTIVE) {
            targetDate = currentMonth.atDay(27).atTime(23, 59, 59).atZone(bakuZone);
            message = "TIME LEFT UNTIL END:";
        }
        else {
            targetDate = currentMonth.atEndOfMonth().atTime(23, 59, 59).atZone(bakuZone);
            message = "SIGN-UP STARTING IN:";
        }

        return new ContestStatusResponse(
                contest.getStatus().name(),
                message,
                targetDate.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
        );
    }

    private void awardUser(UserEntity user, BigDecimal amount) {
        BigDecimal currentReward = user.getRealRewardBalance() != null ? user.getRealRewardBalance() : BigDecimal.ZERO;
        user.setRealRewardBalance(currentReward.add(amount));

        userRepository.save(user);
        log.info("TƏBRİKLƏR! İstifadəçi {} yarışmadan {} USD real pul qazandı!", user.getUsername(), amount);
    }
}
