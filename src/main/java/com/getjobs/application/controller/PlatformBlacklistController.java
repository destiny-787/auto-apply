package com.getjobs.application.controller;

import com.getjobs.application.entity.PlatformBlacklistEntity;
import com.getjobs.application.service.PlatformBlacklistService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * 平台黑名单控制器（统一API，支持 boss/liepin/job51/zhilian）
 */
@RestController
@RequestMapping("/api/blacklist")
@CrossOrigin(origins = "*")
@Slf4j
@RequiredArgsConstructor
public class PlatformBlacklistController {

    private final PlatformBlacklistService blacklistService;

    /**
     * 获取指定平台的所有黑名单
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getBlacklist(@RequestParam(defaultValue = "boss") String platform) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<PlatformBlacklistEntity> list = blacklistService.getBlacklistByPlatform(platform);

            // 按类型分组
            Map<String, List<Map<String, Object>>> grouped = new HashMap<>();
            for (PlatformBlacklistEntity entity : list) {
                String type = entity.getType() != null ? entity.getType() : "unknown";
                grouped.computeIfAbsent(type, k -> new ArrayList<>()).add(Map.of(
                        "id", entity.getId() != null ? entity.getId() : 0,
                        "keyword", entity.getKeyword() != null ? entity.getKeyword() : "",
                        "createTime", entity.getCreateTime() != null ? entity.getCreateTime().toString() : ""
                ));
            }

            response.put("success", true);
            response.put("data", grouped);
            response.put("platform", platform);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("获取黑名单失败", e);
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * 添加黑名单
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> addBlacklist(@RequestBody Map<String, String> body) {
        Map<String, Object> response = new HashMap<>();
        try {
            String platform = body.getOrDefault("platform", "boss");
            String type = body.get("type");
            String keyword = body.get("keyword");

            if (type == null || type.isBlank() || keyword == null || keyword.isBlank()) {
                response.put("success", false);
                response.put("message", "type 和 keyword 不能为空");
                return ResponseEntity.badRequest().body(response);
            }

            boolean ok = blacklistService.addBlacklist(platform, type.trim(), keyword.trim());
            response.put("success", ok);
            response.put("message", ok ? "添加成功" : "已存在，无需重复添加");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("添加黑名单失败", e);
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * 删除黑名单
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteBlacklist(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            boolean ok = blacklistService.removeBlacklist(id);
            response.put("success", ok);
            response.put("message", ok ? "删除成功" : "未找到该记录");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("删除黑名单失败", e);
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}
