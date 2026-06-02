package com.getjobs.application.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 平台黑名单实体类（统一表，支持 boss/liepin/job51/zhilian）
 */
@Data
@TableName("platform_blacklist")
public class PlatformBlacklistEntity {

    /**
     * 主键ID
     */
    @TableId(type = IdType.AUTO)
    private Long id;

    /**
     * 平台：boss / liepin / job51 / zhilian
     */
    private String platform;

    /**
     * 类型：company(公司), recruiter(招聘者), job(职位), keyword(关键词)
     */
    private String type;

    /**
     * 黑名单关键词
     */
    private String keyword;

    /**
     * 创建时间
     */
    private LocalDateTime createTime;
}
