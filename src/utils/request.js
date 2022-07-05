import store from "@/store";
import axios from "axios";
import router from '@/router'
import { Message } from "element-ui";
import { getTimeStamp } from "@/utils/auth";
const TimeOut = 3600; // 定义超时时间
// create an axios instance
const service = axios.create({
  baseURL: process.env.VUE_APP_BASE_API, // url = base url + request url
  // withCredentials: true, // send cookies when cross-domain requests
  timeout: 8000, // request timeout
});

// request interceptor
service.interceptors.request.use(
  (config) => {
    // 在这个位置需要统一的去注入token
    if (store.getters.token) {
      if (IsCheckTimeOut()) {
        // 如果它为true表示 过期了
        // token没用了 因为超时了
        store.dispatch("user/logout"); // 登出操作
        // 跳转到登录页
        router.push("/login");
        return Promise.reject(new Error("token超时了"));
      }
      // 如果token存在 注入token
      config.headers["Authorization"] = `Bearer ${store.getters.token}`;
    }
    return config; // 必须返回配置
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    // axios默认加了一层data
    const { success, message, data } = response.data;
    //   要根据success的成功与否决定下面的操作
    if (success) {
      return data;
    } else {
      // 业务已经错误了 还能进then ? 不能 ！ 应该进catch
      Message.error(message); // 提示错误消息
      return Promise.reject(new Error(message));
    }
  },
  error => {
    // error 信息 里面 response的对象
    if (error.response && error.response.data && error.response.data.code === 10002) {
      // 当等于10002的时候 表示 后端告诉我token超时了
      store.dispatch('user/logout') // 登出action 删除token
      router.push('/login')
    } else {
      Message.error(error.message) // 提示错误信息
    }
    return Promise.reject(error)
  }
);

function IsCheckTimeOut() {
  var currentTime = Date.now(); // 当前时间戳
  var timeStamp = getTimeStamp(); // 缓存时间戳
  return (currentTime - timeStamp) / 1000 > TimeOut;
}
export default service;
