package com.getjobs.application.controller;

import com.getjobs.application.entity.*;
import com.getjobs.application.service.*;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.hwpf.extractor.WordExtractor;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

/**
 * AI配置控制器
 * 提供AI配置管理的REST API接口
 */
@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
@Slf4j
public class AiConfigController {


    @Autowired
    private AiService aiService;

    @Autowired
    private BossService bossService;

    @Autowired
    private LiepinService liepinService;

    @Autowired
    private Job51Service job51Service;

    @Autowired
    private ZhilianService zhilianService;

    @Autowired
    private ConfigService configService;

    /**
     * 获取AI配置
     * @return AI配置信息
     */
    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getAiConfig() {
        Map<String, Object> response = new HashMap<>();

        try {
            AiEntity aiEntity = aiService.getAiConfig();

            response.put("success", true);
            response.put("data", aiEntity);
            response.put("message", "获取AI配置成功");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("获取AI配置失败", e);
            response.put("success", false);
            response.put("message", "获取AI配置失败: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * 保存或更新AI配置
     * @param requestBody 请求体包含introduce和prompt
     * @return 保存结果
     */
    @PostMapping("/config")
    public ResponseEntity<Map<String, Object>> saveAiConfig(@RequestBody Map<String, String> requestBody) {
        Map<String, Object> response = new HashMap<>();

        try {
            String introduce = requestBody.get("introduce");
            String prompt = requestBody.get("prompt");

            if (introduce == null || prompt == null) {
                response.put("success", false);
                response.put("message", "参数不完整，introduce和prompt不能为空");
                return ResponseEntity.badRequest().body(response);
            }

            AiEntity aiEntity = aiService.saveOrUpdateAiConfig(introduce, prompt);

            response.put("success", true);
            response.put("data", aiEntity);
            response.put("message", "保存AI配置成功");

            log.info("保存AI配置成功，ID: {}", aiEntity.getId());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("保存AI配置失败", e);
            response.put("success", false);
            response.put("message", "保存AI配置失败: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * 健康检查接口
     * @return 服务状态
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("service", "AiConfigController");
        response.put("status", "healthy");
        response.put("timestamp", System.currentTimeMillis());

        return ResponseEntity.ok(response);
    }

    /**
     * AI 文本生成测试接口（GET）
     * 示例：/api/ai/chat?content=你好，帮我写一句简洁的问候语
     */
    @GetMapping("/chat")
    public ResponseEntity<Map<String, Object>> chat(@RequestParam(name = "content") String content) {
        Map<String, Object> response = new HashMap<>();
        try {
            if (content == null || content.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "content 参数不能为空");
                return ResponseEntity.badRequest().body(response);
            }

            String reply = aiService.sendRequest(content.trim());
            response.put("success", true);
            response.put("data", reply);
            response.put("message", "AI 请求成功");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("AI 请求失败", e);
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * AI 对话（POST，支持多轮对话）
     */
    @PostMapping("/chat")
    public ResponseEntity<Map<String, Object>> chatPost(@RequestBody Map<String, Object> requestBody) {
        Map<String, Object> response = new HashMap<>();
        try {
            String userMessage = (String) requestBody.get("message");
            @SuppressWarnings("unchecked")
            java.util.List<Map<String, String>> history =
                    (java.util.List<Map<String, String>>) requestBody.get("history");

            if (userMessage == null || userMessage.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "message 不能为空");
                return ResponseEntity.badRequest().body(response);
            }

            // 构建对话上下文
            StringBuilder fullPrompt = new StringBuilder();
            if (history != null && !history.isEmpty()) {
                fullPrompt.append("【对话历史】\n");
                for (Map<String, String> msg : history) {
                    fullPrompt.append(msg.get("role")).append(": ").append(msg.get("content")).append("\n");
                }
                fullPrompt.append("---\n");
            }
            fullPrompt.append("【当前消息】\n").append(userMessage);
            fullPrompt.append("\n\n请用中文简洁回复，控制在300字以内。");

            String reply = aiService.sendRequest(fullPrompt.toString());
            response.put("success", true);
            response.put("data", reply);
            response.put("message", "OK");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("AI 对话失败", e);
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * AI 简历分析：根据简历内容推荐适合的岗位类型和搜索关键词
     */
    @PostMapping("/resume-analyze")
    public ResponseEntity<Map<String, Object>> analyzeResume(@RequestBody Map<String, String> requestBody) {
        Map<String, Object> response = new HashMap<>();
        try {
            String resumeText = requestBody.get("resume");
            String jobType = requestBody.get("jobType");
            if (resumeText == null || resumeText.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "简历内容不能为空");
                return ResponseEntity.badRequest().body(response);
            }

            String jobTypeHint = (jobType != null && !jobType.isBlank())
                    ? "用户倾向的岗位类型：" + jobType + "，请优先推荐该类型的岗位。\n"
                    : "";

            String prompt = """
                    你是一位资深的职业规划师和招聘专家。请根据以下简历内容，进行详细分析：

                    【简历内容】
                    %s

                    %s请从以下维度进行分析并输出（用中文）：
                    1. 🎯 **推荐岗位类型**：列出3-5个最适合的岗位方向
                    2. 🔑 **核心技能标签**：提取简历中的关键技能关键词（用于搜索岗位）
                    3. 💰 **建议薪资范围**：根据行业标准给出合理薪资范围
                    4. 🏢 **推荐行业方向**：适合投递的行业领域
                    5. ✍️ **招呼语建议**：提供一段通用的、吸引HR的打招呼语模板（50字左右）

                    请以JSON格式输出，包含以下字段：
                    {
                      "jobTypes": ["岗位1", "岗位2", ...],
                      "keywords": ["关键词1", "关键词2", ...],
                      "salaryRange": "薪资范围",
                      "industries": ["行业1", "行业2", ...],
                      "greetingTemplate": "招呼语模板"
                    }
                    只输出JSON，不要有其他文字。
                    """.formatted(resumeText.trim(), jobTypeHint);

            String aiResult = aiService.sendRequest(prompt);
            response.put("success", true);
            response.put("data", aiResult);
            response.put("message", "简历分析完成");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("简历分析失败", e);
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * AI 简历分析（文件上传）：支持 PDF / Word 文档
     */
    @PostMapping("/resume-analyze/upload")
    public ResponseEntity<Map<String, Object>> analyzeResumeUpload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "jobType", required = false) String jobType) {
        Map<String, Object> response = new HashMap<>();
        try {
            if (file.isEmpty()) {
                response.put("success", false);
                response.put("message", "文件不能为空");
                return ResponseEntity.badRequest().body(response);
            }

            // 限制文件大小 10MB
            if (file.getSize() > 10 * 1024 * 1024) {
                response.put("success", false);
                response.put("message", "文件大小不能超过10MB");
                return ResponseEntity.badRequest().body(response);
            }

            String filename = file.getOriginalFilename();
            if (filename == null) {
                response.put("success", false);
                response.put("message", "无法获取文件名");
                return ResponseEntity.badRequest().body(response);
            }

            String lowerName = filename.toLowerCase();
            String resumeText;

            if (lowerName.endsWith(".pdf")) {
                try (PDDocument document = Loader.loadPDF(file.getBytes())) {
                    PDFTextStripper stripper = new PDFTextStripper();
                    stripper.setSortByPosition(true);
                    resumeText = stripper.getText(document);
                }
            } else if (lowerName.endsWith(".docx")) {
                try (XWPFDocument document = new XWPFDocument(file.getInputStream())) {
                    XWPFWordExtractor extractor = new XWPFWordExtractor(document);
                    resumeText = extractor.getText();
                }
            } else if (lowerName.endsWith(".doc")) {
                try (HWPFDocument document = new HWPFDocument(file.getInputStream())) {
                    WordExtractor extractor = new WordExtractor(document);
                    resumeText = extractor.getText();
                }
            } else {
                response.put("success", false);
                response.put("message", "不支持的文件格式，请上传 PDF、DOCX 或 DOC 文件");
                return ResponseEntity.badRequest().body(response);
            }

            if (resumeText == null || resumeText.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "无法从文件中提取文本内容，请确保文件包含可选择的文字");
                return ResponseEntity.badRequest().body(response);
            }

            // 复用现有的分析逻辑
            String jobTypeHint = (jobType != null && !jobType.isBlank())
                    ? "用户倾向的岗位类型：" + jobType + "，请优先推荐该类型的岗位。\n"
                    : "";

            String prompt = """
                    你是一位资深的职业规划师和招聘专家。请根据以下简历内容，进行详细分析：

                    【简历内容】
                    %s

                    %s请从以下维度进行分析并输出（用中文）：
                    1. 🎯 **推荐岗位类型**：列出3-5个最适合的岗位方向
                    2. 🔑 **核心技能标签**：提取简历中的关键技能关键词（用于搜索岗位）
                    3. 💰 **建议薪资范围**：根据行业标准给出合理薪资范围
                    4. 🏢 **推荐行业方向**：适合投递的行业领域
                    5. ✍️ **招呼语建议**：提供一段通用的、吸引HR的打招呼语模板（50字左右）

                    请以JSON格式输出，包含以下字段：
                    {
                      "jobTypes": ["岗位1", "岗位2", ...],
                      "keywords": ["关键词1", "关键词2", ...],
                      "salaryRange": "薪资范围",
                      "industries": ["行业1", "行业2", ...],
                      "greetingTemplate": "招呼语模板"
                    }
                    只输出JSON，不要有其他文字。
                    """.formatted(resumeText.trim(), jobTypeHint);

            String aiResult = aiService.sendRequest(prompt);
            response.put("success", true);
            response.put("data", aiResult);
            response.put("message", "简历文件分析完成");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("简历文件分析失败", e);
            response.put("success", false);
            response.put("message", "分析失败: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * AI 生成招呼语：根据岗位JD生成个性化招呼语
     */
    @PostMapping("/generate-greeting")
    public ResponseEntity<Map<String, Object>> generateGreeting(@RequestBody Map<String, String> requestBody) {
        Map<String, Object> response = new HashMap<>();
        try {
            String jobName = requestBody.get("jobName");
            String jobDescription = requestBody.get("jobDescription");
            String companyName = requestBody.get("companyName");

            if (jobName == null || jobDescription == null) {
                response.put("success", false);
                response.put("message", "岗位名称和描述不能为空");
                return ResponseEntity.badRequest().body(response);
            }

            String prompt = String.format("""
                    你是一位经验丰富的求职者，正在Boss直聘上和HR打招呼。
                    请根据以下岗位信息，生成一段自然、真诚、有吸引力的招呼语（50字以内）：

                    岗位名称：%s
                    公司名称：%s
                    岗位描述：%s

                    要求：
                    - 语气自然真诚，不要过于奉承
                    - 突出与岗位的匹配度
                    - 表达对岗位的兴趣
                    - 只用中文，不要有emoji
                    - 直接输出招呼语，不要有其他内容
                    """, jobName, companyName != null ? companyName : "未提供", jobDescription);

            String greeting = aiService.sendRequest(prompt);
            response.put("success", true);
            response.put("data", greeting);
            response.put("message", "招呼语生成成功");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("生成招呼语失败", e);
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * AI 设置代理：通过自然语言对话修改任意平台的设置
     * POST /api/ai/settings-agent
     * 请求体: { "message": "用户消息", "history": [{"role":"user/assistant","content":"..."}] }
     */
    @PostMapping("/settings-agent")
    public ResponseEntity<Map<String, Object>> settingsAgent(@RequestBody Map<String, Object> requestBody) {
        Map<String, Object> response = new HashMap<>();
        try {
            String userMessage = (String) requestBody.get("message");
            @SuppressWarnings("unchecked")
            java.util.List<Map<String, String>> history =
                    (java.util.List<Map<String, String>>) requestBody.get("history");

            if (userMessage == null || userMessage.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "message 不能为空");
                return ResponseEntity.badRequest().body(response);
            }

            // 构建包含所有系统设置的提示词
            String systemPrompt = buildSettingsSystemPrompt();

            StringBuilder fullPrompt = new StringBuilder();
            fullPrompt.append(systemPrompt);
            fullPrompt.append("\n\n---\n\n");
            if (history != null && !history.isEmpty()) {
                fullPrompt.append("【对话历史】\n");
                for (Map<String, String> msg : history) {
                    fullPrompt.append(msg.get("role")).append(": ").append(msg.get("content")).append("\n");
                }
                fullPrompt.append("---\n");
            }
            fullPrompt.append("【用户消息】\n").append(userMessage);
            fullPrompt.append("\n\n请分析用户的意图，如果需要修改设置，返回对应的JSON。如果不需要修改设置（如闲聊），actions 数组留空。只返回JSON，不要有其他文字。");

            String aiResult = aiService.sendRequest(fullPrompt.toString());

            // 解析 AI 返回的 JSON
            String cleanedJson = aiResult
                    .replaceAll("```json\\s*", "")
                    .replaceAll("```\\s*", "")
                    .trim();

            JSONObject aiResponse;
            try {
                aiResponse = new JSONObject(cleanedJson);
            } catch (Exception parseEx) {
                log.warn("AI返回的JSON解析失败，原始结果: {}", aiResult);
                Map<String, Object> fallbackData = new HashMap<>();
                fallbackData.put("actions", List.of());
                fallbackData.put("summary", "AI 返回解析失败: " + parseEx.getMessage() + "\n原始响应: " + aiResult);
                response.put("success", true);
                response.put("data", new JSONObject(fallbackData).toString());
                response.put("message", "OK");
                return ResponseEntity.ok(response);
            }

            JSONArray actions = aiResponse.optJSONArray("actions");
            String summary = aiResponse.optString("summary", "未检测到设置相关需求");

            List<Map<String, Object>> results = new ArrayList<>();

            if (actions != null) {
                for (int i = 0; i < actions.length(); i++) {
                    JSONObject action = actions.getJSONObject(i);
                    String platform = action.optString("platform", "");
                    String field = action.optString("field", "");
                    String value = action.optString("value", "");
                    String reason = action.optString("reason", "");

                    boolean success = applySetting(platform, field, value);

                    Map<String, Object> result = new HashMap<>();
                    result.put("platform", platform);
                    result.put("field", field);
                    result.put("value", value);
                    result.put("reason", reason);
                    result.put("success", success);
                    results.add(result);

                    log.info("设置代理 - platform={}, field={}, value={}, success={}", platform, field, value, success);
                }
            }

            Map<String, Object> data = new HashMap<>();
            data.put("actions", results);
            data.put("summary", summary);

            response.put("success", true);
            response.put("data", new JSONObject(data).toString());
            response.put("message", "OK");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("设置代理处理失败", e);
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * 构建设置代理的系统提示词，描述所有平台的可用设置字段
     */
    private String buildSettingsSystemPrompt() {
        return """
                你是一个应用程序设置管理助手，负责管理 Get Jobs 求职助手的所有配置。
                用户会用自然语言描述他们想要修改的设置，你需要理解用户意图并返回结构化JSON。

                ## 支持的平台和设置字段

                ### Boss直聘 (platform: "boss")
                可用字段及其说明：
                - keywords: 搜索关键词，多个用逗号分隔（如 "Java,Python,AI工程师"）
                - cityCode: 城市名称（如 "北京", "上海", "深圳", "杭州", "广州"）
                - industry: 行业，多个用逗号分隔（如 "互联网,金融,教育"）
                - jobType: 职位类型（如 "全职", "实习"）
                - experience: 工作经验要求，多个用逗号分隔（如 "1-3年,3-5年,应届生"）
                - degree: 学历要求，多个用逗号分隔（如 "本科,硕士,大专"）
                - salary: 薪资范围，多个用逗号分隔（如 "10-15K,15-20K,20-30K"）
                - scale: 公司规模，多个用逗号分隔（如 "100-499人,500-999人,1000人以上"）
                - stage: 融资阶段，多个用逗号分隔（如 "A轮,B轮,C轮,上市公司"）
                - sayHi: 默认打招呼语文本
                - expectedSalaryMin: 最低期望薪资，纯数字（单位K/月），如 15 表示15K
                - expectedSalaryMax: 最高期望薪资，纯数字（单位K/月），如 25 表示25K
                - enableAi: 是否启用AI生成招呼语（0=关闭, 1=开启）
                - sendImgResume: 是否发送图片简历（0=关闭, 1=开启）
                - filterDeadHr: 是否过滤不在线HR（0=关闭, 1=开启）
                - waitTime: 页面操作等待时间，纯数字（单位秒），如 3
                - debugger: 调试模式（0=关闭, 1=开启）

                ### 猎聘 (platform: "liepin")
                可用字段及其说明：
                - keywords: 搜索关键词，多个用逗号分隔
                - city: 城市名称（如 "北京", "上海", "深圳"）
                - salaryCode: 薪资范围（如 "10-15K", "15-25K"）

                ### 51job (platform: "job51")
                可用字段及其说明：
                - keywords: 搜索关键词，多个用逗号分隔
                - jobArea: 城市/区域（如 "北京", "上海"）
                - salary: 薪资范围

                ### 智联招聘 (platform: "zhilian")
                可用字段及其说明：
                - keywords: 搜索关键词，多个用逗号分隔
                - cityCode: 城市名称
                - salary: 薪资范围

                ### AI配置 (platform: "ai")
                可用字段及其说明：
                - introduce: 技能介绍文本，描述你的专业技能和工作经验
                - prompt: AI提示词模板，支持 %s 占位符

                ## 返回JSON格式
                你必须只返回一个JSON对象，格式如下：
                {
                    "actions": [
                        {
                            "platform": "boss|liepin|job51|zhilian|ai",
                            "field": "字段名",
                            "value": "新值（注意类型：数字字段传数字字符串如"15"，开关字段传"0"或"1"）",
                            "reason": "简短说明为什么这样修改"
                        }
                    ],
                    "summary": "对所有修改操作的中文汇总说明"
                }

                规则：
                1. 多个字段的修改用多个 action 表示
                2. 如果用户消息与设置无关（闲聊、问问题等），actions 数组留空
                3. 对于数字类型字段（expectedSalaryMin/Max、waitTime、enableAi等），value 必须是纯数字字符串
                4. summary 用中文简要概括做了什么
                5. 只输出JSON，不要有任何其他文字
                """;
    }

    /**
     * 应用设置变更到指定平台
     */
    private boolean applySetting(String platform, String field, String value) {
        try {
            switch (platform) {
                case "boss" -> {
                    BossConfigEntity config = bossService.getFirstConfig();
                    if (config == null) config = new BossConfigEntity();
                    applyBossField(config, field, value);
                    bossService.updateConfig(config);
                }
                case "liepin" -> {
                    LiepinConfigEntity config = liepinService.getFirstConfig();
                    if (config == null) config = new LiepinConfigEntity();
                    applyLiepinField(config, field, value);
                    if (config.getId() != null) {
                        liepinService.updateConfig(config);
                    } else {
                        liepinService.saveOrUpdateFirstSelective(config);
                    }
                }
                case "job51" -> {
                    Job51ConfigEntity config = job51Service.getFirstConfig();
                    if (config == null) config = new Job51ConfigEntity();
                    applyJob51Field(config, field, value);
                    job51Service.updateConfig(config);
                }
                case "zhilian" -> {
                    ZhilianConfigEntity config = zhilianService.getFirstConfig();
                    if (config == null) config = new ZhilianConfigEntity();
                    applyZhilianField(config, field, value);
                    zhilianService.updateConfig(config);
                }
                case "ai" -> {
                    AiEntity aiConfig = aiService.getAiConfig();
                    String introduce = aiConfig.getIntroduce();
                    String prompt = aiConfig.getPrompt();
                    if ("introduce".equals(field)) {
                        introduce = value;
                    } else if ("prompt".equals(field)) {
                        prompt = value;
                    }
                    aiService.saveOrUpdateAiConfig(introduce, prompt);
                }
                default -> {
                    log.warn("未知平台: {}", platform);
                    return false;
                }
            }
            return true;
        } catch (Exception e) {
            log.error("应用设置失败: platform={}, field={}, value={}", platform, field, value, e);
            return false;
        }
    }

    private void applyBossField(BossConfigEntity config, String field, String value) {
        switch (field) {
            case "keywords" -> config.setKeywords(value);
            case "cityCode" -> config.setCityCode(value);
            case "industry" -> config.setIndustry(value);
            case "jobType" -> config.setJobType(value);
            case "experience" -> config.setExperience(value);
            case "degree" -> config.setDegree(value);
            case "salary" -> config.setSalary(value);
            case "scale" -> config.setScale(value);
            case "stage" -> config.setStage(value);
            case "sayHi" -> config.setSayHi(value);
            case "expectedSalaryMin" -> config.setExpectedSalaryMin(parseIntSafe(value));
            case "expectedSalaryMax" -> config.setExpectedSalaryMax(parseIntSafe(value));
            case "enableAi" -> config.setEnableAi(parseIntSafe(value));
            case "sendImgResume" -> config.setSendImgResume(parseIntSafe(value));
            case "filterDeadHr" -> config.setFilterDeadHr(parseIntSafe(value));
            case "waitTime" -> config.setWaitTime(parseIntSafe(value));
            case "debugger" -> config.setDebugger(parseIntSafe(value));
            default -> log.warn("Boss直聘未知字段: {}", field);
        }
    }

    private void applyLiepinField(LiepinConfigEntity config, String field, String value) {
        switch (field) {
            case "keywords" -> config.setKeywords(value);
            case "city" -> config.setCity(value);
            case "salaryCode" -> config.setSalaryCode(value);
            default -> log.warn("猎聘未知字段: {}", field);
        }
    }

    private void applyJob51Field(Job51ConfigEntity config, String field, String value) {
        switch (field) {
            case "keywords" -> config.setKeywords(value);
            case "jobArea" -> config.setJobArea(value);
            case "salary" -> config.setSalary(value);
            default -> log.warn("51job未知字段: {}", field);
        }
    }

    private void applyZhilianField(ZhilianConfigEntity config, String field, String value) {
        switch (field) {
            case "keywords" -> config.setKeywords(value);
            case "cityCode" -> config.setCityCode(value);
            case "salary" -> config.setSalary(value);
            default -> log.warn("智联招聘未知字段: {}", field);
        }
    }

    private Integer parseIntSafe(String value) {
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            log.warn("无法将 '{}' 转换为整数，返回 null", value);
            return null;
        }
    }

    /**
     * AI 同步到各平台配置
     * POST /api/ai/sync-to-platforms
     * 从技能介绍文本中提取结构化数据，并自动更新所有平台的配置
     */
    @PostMapping("/sync-to-platforms")
    public ResponseEntity<Map<String, Object>> syncToPlatforms(@RequestBody Map<String, String> requestBody) {
        Map<String, Object> response = new HashMap<>();
        try {
            String introduce = requestBody.get("introduce");
            if (introduce == null || introduce.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "技能介绍不能为空");
                return ResponseEntity.badRequest().body(response);
            }

            // 使用 AI 从技能介绍中提取结构化数据
            String extractPrompt = """
                    你是一个数据提取助手。请从以下技能介绍文本中提取求职相关结构化信息。

                    【技能介绍】
                    %s

                    请提取以下字段（如果文本中没有明确提及，字段值设为空）：
                    - keywords: 核心技能关键词列表（如 ["Java", "Python", "Spring Boot"]）
                    - jobType: 期望的职位类型（全职/实习/兼职，未提及则为"全职"）
                    - expectedSalaryMin: 最低期望薪资（纯数字，单位K/月，如 15 表示15K）
                    - expectedSalaryMax: 最高期望薪资（纯数字，单位K/月，如 25 表示25K）
                    - city: 期望工作城市（如 "北京"、"上海"，未提及则为空字符串）

                    只返回JSON，不要有其他文字。格式：
                    {
                      "keywords": ["关键词1", "关键词2"],
                      "jobType": "全职",
                      "expectedSalaryMin": 15,
                      "expectedSalaryMax": 25,
                      "city": "北京"
                    }
                    """.formatted(introduce.trim());

            String aiResult = aiService.sendRequest(extractPrompt);
            String cleanedJson = aiResult
                    .replaceAll("```json\\s*", "")
                    .replaceAll("```\\s*", "")
                    .trim();

            JSONObject extracted;
            try {
                extracted = new JSONObject(cleanedJson);
            } catch (Exception parseEx) {
                log.warn("AI同步提取JSON解析失败: {}", aiResult);
                response.put("success", false);
                response.put("message", "AI提取结构化数据失败: " + parseEx.getMessage());
                return ResponseEntity.internalServerError().body(response);
            }

            JSONArray keywordsArr = extracted.optJSONArray("keywords");
            String keywords = "";
            if (keywordsArr != null && keywordsArr.length() > 0) {
                List<String> kwList = new ArrayList<>();
                for (int i = 0; i < keywordsArr.length(); i++) {
                    kwList.add(keywordsArr.getString(i));
                }
                keywords = String.join(",", kwList);
            }
            String jobType = extracted.optString("jobType", "全职");
            int salaryMin = extracted.optInt("expectedSalaryMin", 0);
            int salaryMax = extracted.optInt("expectedSalaryMax", 0);
            String city = extracted.optString("city", "");

            // 构建薪资字符串
            String salaryStr = "";
            if (salaryMin > 0 && salaryMax > 0) {
                salaryStr = salaryMin + "K-" + salaryMax + "K";
            } else if (salaryMin > 0) {
                salaryStr = salaryMin + "K以上";
            } else if (salaryMax > 0) {
                salaryStr = salaryMax + "K以下";
            }

            List<Map<String, Object>> syncResults = new ArrayList<>();

            // 同步到 Boss
            if (!keywords.isEmpty() || !city.isEmpty() || !jobType.isEmpty()) {
                try {
                    BossConfigEntity bossConfig = bossService.getFirstConfig();
                    if (bossConfig == null) bossConfig = new BossConfigEntity();
                    if (!keywords.isEmpty()) bossConfig.setKeywords(keywords);
                    if (!city.isEmpty()) bossConfig.setCityCode(city);
                    if (!jobType.isEmpty()) bossConfig.setJobType(jobType);
                    if (salaryMin > 0) bossConfig.setExpectedSalaryMin(salaryMin);
                    if (salaryMax > 0) bossConfig.setExpectedSalaryMax(salaryMax);
                    bossService.updateConfig(bossConfig);
                    syncResults.add(Map.of("platform", "boss", "success", true));
                    log.info("同步Boss配置: keywords={}, city={}, jobType={}, salary={}-{}", keywords, city, jobType, salaryMin, salaryMax);
                } catch (Exception e) {
                    syncResults.add(Map.of("platform", "boss", "success", false, "error", e.getMessage()));
                    log.error("同步Boss配置失败", e);
                }
            }

            // 同步到猎聘
            if (!keywords.isEmpty() || !city.isEmpty() || !salaryStr.isEmpty()) {
                try {
                    LiepinConfigEntity liepinConfig = liepinService.getFirstConfig();
                    if (liepinConfig == null) liepinConfig = new LiepinConfigEntity();
                    if (!keywords.isEmpty()) liepinConfig.setKeywords(keywords);
                    if (!city.isEmpty()) liepinConfig.setCity(city);
                    if (!salaryStr.isEmpty()) liepinConfig.setSalaryCode(salaryStr);
                    if (liepinConfig.getId() != null) {
                        liepinService.updateConfig(liepinConfig);
                    } else {
                        liepinService.saveOrUpdateFirstSelective(liepinConfig);
                    }
                    syncResults.add(Map.of("platform", "liepin", "success", true));
                } catch (Exception e) {
                    syncResults.add(Map.of("platform", "liepin", "success", false, "error", e.getMessage()));
                }
            }

            // 同步到 51job
            if (!keywords.isEmpty() || !city.isEmpty() || !salaryStr.isEmpty()) {
                try {
                    Job51ConfigEntity job51Config = job51Service.getFirstConfig();
                    if (job51Config == null) job51Config = new Job51ConfigEntity();
                    if (!keywords.isEmpty()) job51Config.setKeywords(keywords);
                    if (!city.isEmpty()) job51Config.setJobArea(city);
                    if (!salaryStr.isEmpty()) job51Config.setSalary(salaryStr);
                    job51Service.updateConfig(job51Config);
                    syncResults.add(Map.of("platform", "job51", "success", true));
                } catch (Exception e) {
                    syncResults.add(Map.of("platform", "job51", "success", false, "error", e.getMessage()));
                }
            }

            // 同步到智联
            if (!keywords.isEmpty() || !city.isEmpty() || !salaryStr.isEmpty()) {
                try {
                    ZhilianConfigEntity zhilianConfig = zhilianService.getFirstConfig();
                    if (zhilianConfig == null) zhilianConfig = new ZhilianConfigEntity();
                    if (!keywords.isEmpty()) zhilianConfig.setKeywords(keywords);
                    if (!city.isEmpty()) zhilianConfig.setCityCode(city);
                    if (!salaryStr.isEmpty()) zhilianConfig.setSalary(salaryStr);
                    zhilianService.updateConfig(zhilianConfig);
                    syncResults.add(Map.of("platform", "zhilian", "success", true));
                } catch (Exception e) {
                    syncResults.add(Map.of("platform", "zhilian", "success", false, "error", e.getMessage()));
                }
            }

            Map<String, Object> data = new HashMap<>();
            data.put("extracted", Map.of(
                    "keywords", keywords,
                    "jobType", jobType,
                    "expectedSalaryMin", salaryMin,
                    "expectedSalaryMax", salaryMax,
                    "city", city
            ));
            data.put("synced", syncResults);

            response.put("success", true);
            response.put("data", data);
            response.put("message", "同步完成");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("同步到平台配置失败", e);
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}
