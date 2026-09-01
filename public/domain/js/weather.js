(() => {
    const weatherInfo = document.getElementById("weather-info");

    if (!weatherInfo) return;

    const weatherNames = {
        113: "晴",
        116: "局部多云",
        119: "多云",
        122: "阴",
        143: "雾",
        176: "附近有阵雨",
        200: "雷暴",
        248: "雾",
        260: "冻雾",
        263: "小雨",
        266: "小雨",
        293: "小雨",
        296: "小雨",
        299: "中雨",
        302: "中雨",
        305: "大雨",
        308: "大雨",
        323: "小雪",
        326: "小雪",
        329: "中雪",
        332: "中雪",
        335: "大雪",
        338: "大雪",
        353: "阵雨",
        356: "阵雨",
        359: "暴雨",
        386: "雷阵雨",
        389: "雷阵雨",
        392: "雷雪",
        395: "雷雪",
    };

    const weatherIcons = {
        113: "☀️",
        116: "🌤️",
        119: "☁️",
        122: "☁️",
        143: "🌫️",
        176: "🌦️",
        200: "⛈️",
        248: "🌫️",
        260: "🌫️",
        263: "🌦️",
        266: "🌧️",
        293: "🌦️",
        296: "🌧️",
        299: "🌧️",
        302: "🌧️",
        305: "🌧️",
        308: "🌧️",
        323: "🌨️",
        326: "🌨️",
        329: "🌨️",
        332: "❄️",
        335: "❄️",
        338: "❄️",
        353: "🌦️",
        356: "🌧️",
        359: "🌧️",
        386: "⛈️",
        389: "⛈️",
        392: "🌨️",
        395: "❄️",
    };

    const firstValue = (value) => (Array.isArray(value) ? value[0] : null);

    const weatherQuery = "?format=j1&lang=zh";

    const fetchWeather = (url) =>
        fetch(url)
            .then((response) => {
                if (!response.ok) throw new Error(`weather request failed: ${response.status}`);
                return response.json();
            })
            .then((payload) => {
                const data = payload.data || payload;
                const condition = firstValue(data.current_condition);
                const area = firstValue(data.nearest_area);

                if (!condition) throw new Error("weather response has no current condition");

                const city = firstValue(area?.areaName)?.value?.trim();
                const temperature = condition.temp_C?.trim();
                const code = Number(condition.weatherCode);
                const description =
                    weatherNames[code] ||
                    firstValue(condition.lang_zh)?.value?.trim() ||
                    firstValue(condition.weatherDesc)?.value?.trim() ||
                    "天气情况";
                const icon = weatherIcons[code] || "🌡️";

                weatherInfo.textContent = [
                    icon,
                    city,
                    temperature && `${temperature}°C`,
                    description,
                ]
                    .filter(Boolean)
                    .join(" ");
            });

    const loadIpWeather = () => {
        weatherInfo.textContent = "正在使用网络位置…";
        return fetchWeather(`https://wttr.in/${weatherQuery}`);
    };

    const useIpWeather = () =>
        loadIpWeather().catch(() => {
            weatherInfo.textContent = "天气暂时不可用";
            weatherInfo.title = "天气服务暂时不可用，请稍后再试";
        });

    const loadWeather = () => {
        weatherInfo.textContent = "正在请求位置…";

        if (!navigator.geolocation) {
            return useIpWeather();
        }

        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                weatherInfo.textContent = "正在读取天气…";
                fetchWeather(
                    `https://wttr.in/${coords.latitude},${coords.longitude}${weatherQuery}`,
                ).catch(useIpWeather);
            },
            useIpWeather,
            {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 300000,
            },
        );
    };

    loadWeather();
})();
