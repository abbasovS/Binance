package com.example.tradems.repository;
import com.example.tradems.enums.TradeStatus;
import com.example.tradems.model.TradeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface TradeRepository extends JpaRepository<TradeEntity, UUID> {
    List<TradeEntity> findByUser_IdAndStatus(Long userId, TradeStatus status);

    List<TradeEntity> findAllByStatus(TradeStatus tradeStatus);
    List<TradeEntity> findByUser_IdInAndStatus(List<Long> userIds, TradeStatus status);

    List<TradeEntity> findByUser_IdInAndStatusInOrderByCloseTimeDesc(List<Long> userIds, List<TradeStatus> statuses);
    void deleteAllByUser_Id(Long userId);
    List<TradeEntity> findByUser_IdAndStatusInOrderByCloseTimeDesc(Long userId, List<TradeStatus> statuses);
}
