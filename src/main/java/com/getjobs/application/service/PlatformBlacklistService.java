package com.getjobs.application.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.getjobs.application.entity.PlatformBlacklistEntity;
import com.getjobs.application.mapper.PlatformBlacklistMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 平台黑名单服务（统一管理 boss/liepin/job51/zhilian 的屏蔽词）
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PlatformBlacklistService {

    private final PlatformBlacklistMapper mapper;

    /**
     * 自动创建 platform_blacklist 表（如果不存在）
     */
    @PostConstruct
    public void ensureTable() {
        try {
            // 从 Spring datasource 配置获取数据库路径
            String dbUrl = "jdbc:sqlite:./db/getjobs.db";
            try (Connection conn = DriverManager.getConnection(dbUrl);
                 Statement stmt = conn.createStatement()) {
                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS platform_blacklist (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        platform TEXT NOT NULL DEFAULT 'boss',
                        type TEXT NOT NULL DEFAULT 'keyword',
                        keyword TEXT NOT NULL,
                        create_time TEXT
                    )
                    """);
                log.info("platform_blacklist 表已就绪");

                // 从旧的 boss_blacklist 迁移数据（如果新表为空且旧表存在）
                var rs = stmt.executeQuery("SELECT COUNT(*) FROM platform_blacklist");
                if (rs.next() && rs.getInt(1) == 0) {
                    try {
                        stmt.execute("""
                            INSERT INTO platform_blacklist (platform, type, keyword, create_time)
                            SELECT 'boss', type, value, created_at FROM boss_blacklist
                            """);
                        long migrated = stmt.getUpdateCount();
                        if (migrated > 0) {
                            log.info("已从 boss_blacklist 迁移 {} 条数据到 platform_blacklist", migrated);
                        }
                    } catch (Exception migEx) {
                        log.debug("boss_blacklist 迁移跳过: {}", migEx.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            log.warn("创建 platform_blacklist 表失败（可能已存在）: {}", e.getMessage());
        }
    }

    /**
     * 获取指定平台的指定类型黑名单关键词集合
     */
    public Set<String> getBlacklistByType(String platform, String type) {
        LambdaQueryWrapper<PlatformBlacklistEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PlatformBlacklistEntity::getPlatform, platform)
                .eq(PlatformBlacklistEntity::getType, type);
        List<PlatformBlacklistEntity> list = mapper.selectList(wrapper);
        return list.stream()
                .map(PlatformBlacklistEntity::getKeyword)
                .collect(Collectors.toSet());
    }

    /**
     * 获取指定平台的公司黑名单
     */
    public Set<String> getBlackCompanies(String platform) {
        return getBlacklistByType(platform, "company");
    }

    /**
     * 获取指定平台的招聘者黑名单
     */
    public Set<String> getBlackRecruiters(String platform) {
        return getBlacklistByType(platform, "recruiter");
    }

    /**
     * 获取指定平台的职位黑名单
     */
    public Set<String> getBlackJobs(String platform) {
        return getBlacklistByType(platform, "job");
    }

    /**
     * 获取指定平台的关键词黑名单
     */
    public Set<String> getBlackKeywords(String platform) {
        return getBlacklistByType(platform, "keyword");
    }

    /**
     * 添加黑名单
     */
    public boolean addBlacklist(String platform, String type, String keyword) {
        LambdaQueryWrapper<PlatformBlacklistEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PlatformBlacklistEntity::getPlatform, platform)
                .eq(PlatformBlacklistEntity::getType, type)
                .eq(PlatformBlacklistEntity::getKeyword, keyword);
        if (mapper.selectCount(wrapper) > 0) {
            log.debug("黑名单已存在: platform={}, type={}, keyword={}", platform, type, keyword);
            return false;
        }

        PlatformBlacklistEntity entity = new PlatformBlacklistEntity();
        entity.setPlatform(platform);
        entity.setType(type);
        entity.setKeyword(keyword);
        entity.setCreateTime(LocalDateTime.now());
        mapper.insert(entity);
        log.info("添加黑名单: platform={}, type={}, keyword={}", platform, type, keyword);
        return true;
    }

    /**
     * 删除黑名单
     */
    public boolean removeBlacklist(Long id) {
        return mapper.deleteById(id) > 0;
    }

    /**
     * 按平台和关键词删除黑名单
     */
    public boolean removeBlacklistByKeyword(String platform, String type, String keyword) {
        LambdaQueryWrapper<PlatformBlacklistEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PlatformBlacklistEntity::getPlatform, platform)
                .eq(PlatformBlacklistEntity::getType, type)
                .eq(PlatformBlacklistEntity::getKeyword, keyword);
        return mapper.delete(wrapper) > 0;
    }

    /**
     * 获取指定平台的所有黑名单
     */
    public List<PlatformBlacklistEntity> getBlacklistByPlatform(String platform) {
        LambdaQueryWrapper<PlatformBlacklistEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PlatformBlacklistEntity::getPlatform, platform)
                .orderByDesc(PlatformBlacklistEntity::getCreateTime);
        return mapper.selectList(wrapper);
    }

    /**
     * 获取所有黑名单
     */
    public List<PlatformBlacklistEntity> getAllBlacklist() {
        return mapper.selectList(null);
    }
}
