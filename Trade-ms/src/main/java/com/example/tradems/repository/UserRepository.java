package com.example.tradems.repository;

import com.example.tradems.model.UserEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, Long>
{
    List<UserEntity> findAll(Sort sort);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM UserEntity u WHERE u.id = :id")
    Optional<UserEntity> findByIdWithLock(@Param("id") Long id);

    boolean existsByUsernameIgnoreCase(String username);

    Optional<UserEntity> findByEmail(String normalizedEmail);

    Optional<UserEntity> findByEmailIgnoreCase(String email);



    List<UserEntity> findTop3ByPremiumTrueOrderByVirtualBalanceDesc();
    @Modifying
    @Query("UPDATE UserEntity u SET u.virtualBalance = 10000, u.frozenBalance = 0")
    void resetAllBalances();

    @Modifying
    @Query("UPDATE UserEntity u SET u.premium = false WHERE u.premium = true")
    void removeAllPremiumStatus();

    List<UserEntity> findByLastJoinedMonth(String lastJoinedMonth);

}
