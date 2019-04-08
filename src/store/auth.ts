import Vue from 'vue'
import { AxiosRequestConfig } from 'axios'
import { ILoginPayload, IUser } from '@/interface/User/ILogin'
import { ILoginCheckPayload, ILoginCheck } from '@/interface/User/ILoginCheck'
import { ILogoutPayload, ILogout } from '@/interface/User/ILogout'
import { setToken, unsetToken, cancelToken } from '@/utilities/'

/**
 * store 用インターフェイス
 */
export interface IState {
  /**
   * ユーザー情報
   */
  authUser: IUser | null
  /**
   * ログイン中かどうか
   */
  loggedIn: boolean
  /**
   * ローディング
   */
  busy: {
    register: boolean
    login: boolean
    loginCheck: boolean
    logout: boolean
  }
}

/**
 * state
 */
export const state = (): IState => ({
  authUser: null,
  loggedIn: false,
  busy: {
    register: false,
    login: false,
    loginCheck: false,
    logout: false
  }
})

/**
 * getters
 */
export const getters = {
  isAuthenticated(state: IState): boolean {
    return !!state.loggedIn
  }
}

/**
 * mutations
 */
export const mutations = {
  /**
   * ユーザー情報を更新する
   */
  SET_USER: function(state: IState, user: IUser): void {
    state.authUser = user
  },
  /**
   * ログイン状態を更新する
   */
  updateLoginStatus(state: IState, status: boolean): void {
    state.loggedIn = status
  },
  /**
   * 処理中ステータスを更新する
   */
  updateBusyStatus(
    state: IState,
    payload: [keyof IState['busy'], boolean]
  ): void {
    const [key, status] = payload

    Vue.set(state.busy, key, status)
  }
}

/**
 * actions
 */
export const actions = {
  /**
   * login
   * @param state
   * @param commit
   * @param token
   */
  async login(
    this: Vue,
    // @ts-ignore
    { state, commit }: any,
    payload: ILoginPayload
  ): Promise<IUser | void> {
    console.log('login payload:', payload)

    // ログイン中、またはすでにログイン済みなら処理を抜ける
    if (state.busy.login || state.loggedIn) {
      return
    }

    // TODO: payload の validation はここかな

    commit('updateBusyStatus', ['login', true])

    try {
      const {
        data,
        headers,
        status,
        statusText,
        config
      } = await this.$axios.post<IUser>(
        this.$C.API_ENDPOINT.LOGIN,
        {
          username: payload.username,
          password: payload.password
        },
        {
          cancelToken: cancelToken.getToken(payload)
        } as AxiosRequestConfig
      )

      setToken(headers['access-token'])

      // ログイン状態を更新
      commit('updateLoginStatus', data.loggedIn)
      // ユーザー情報をストアに保存
      commit('SET_USER', data)

      return data
    } catch (err) {
      throw new Error(err)
    } finally {
      commit('updateBusyStatus', ['login', false])
    }
  },

  /**
   * logout
   * @param state
   * @param commit
   */
  async logout(
    this: Vue,
    // @ts-ignore
    { state, commit }: any,
    payload: ILogoutPayload
  ): Promise<ILogout | void> {
    console.log('logout')

    // 処理中、未ログインなら中断
    if (state.busy.logout) {
      return
    }

    commit('updateBusyStatus', ['logout', true])

    try {
      const token: string = payload.token
      const {
        data,
        headers,
        status,
        statusText,
        config
      } = await this.$axios.post<ILogout>(this.$C.API_ENDPOINT.LOGOUT, {}, {
        headers: {
          'access-token': token
        },
        cancelToken: cancelToken.getToken(payload)
      } as AxiosRequestConfig)

      unsetToken()

      // ログイン状態を更新
      commit('updateLoginStatus', data.loggedIn)

      return data
    } catch (err) {
      throw new Error(err)
    } finally {
      commit('updateBusyStatus', ['logout', false])
    }
  },

  /**
   * loginCheck
   * @param state
   * @param commit
   * @param token
   */
  async loginCheck(
    this: Vue,
    // @ts-ignore
    { state, commit }: any,
    payload: ILoginCheckPayload
  ): Promise<ILoginCheck | void> {
    console.log('loginCheck', payload)

    commit('updateBusyStatus', ['loginCheck', true])

    try {
      const postHeaders = {}
      const token: string | undefined = payload.token
      if (token) {
        postHeaders['access-token'] = token
      }

      const {
        data,
        headers,
        status,
        statusText,
        config
      } = await this.$axios.post<ILoginCheck>(
        this.$C.API_ENDPOINT.LOGIN_CHECK,
        {},
        {
          headers: postHeaders,
          cancelToken: cancelToken.getToken(payload)
        } as AxiosRequestConfig
      )

      if (headers['access-token'] && data.loggedIn) {
        setToken(headers['access-token'])
      }

      // ログイン状態を更新
      commit('updateLoginStatus', data.loggedIn)

      return data
    } catch (err) {
      throw new Error(err)
    } finally {
      commit('updateBusyStatus', ['loginCheck', false])
    }
  }
}
