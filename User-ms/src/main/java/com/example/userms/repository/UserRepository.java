package com.example.userms.repository;

import com.example.userms.model.UserEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<UserEntity, UUID>
{
    Optional<UserEntity> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByPhoneNumber(String phoneNumber);
    java.util.List<UserEntity> findAllByTelegramChatIdIsNotNull();

    Optional<UserEntity> findByTelegramConnectCode(String telegramConnectCode);

    List<UserEntity> findAllByActiveTrue();

    Page<UserEntity> findAll(Pageable pageable);


}
