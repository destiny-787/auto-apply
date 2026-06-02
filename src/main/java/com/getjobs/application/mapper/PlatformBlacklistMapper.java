package com.getjobs.application.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.getjobs.application.entity.PlatformBlacklistEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * 平台黑名单Mapper
 */
@Mapper
public interface PlatformBlacklistMapper extends BaseMapper<PlatformBlacklistEntity> {
}
