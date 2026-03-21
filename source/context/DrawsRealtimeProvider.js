import React, { createContext, useContext, useEffect, useState } from 'react'
import moment from 'moment-timezone'
import supabase from '../utils/supabaseClient'

const DrawsRealtimeContext = createContext()

export const DrawsRealtimeProvider = ({ children }) => {
    const [draws, setDraws] = useState([])
    const today = moment().tz('Asia/Manila').format('YYYY-MM-DD')


    // console.log(draws, "THE DRAW IN DRAW REALTIME CONTEXT")
    

    useEffect(() => {

        const channel = supabase
            .channel('today-draws')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'draws',
                    // filter: `draw_date=eq.${today},is_deleted=eq.false`
                },
                (payload) => {


                    console.log('DRAW UPDATE IN DRAW REALTIME CONTEXT!',payload)

                    // if (payload.eventType === 'INSERT') {
                    //     setDraws(prev => [...prev, payload.new])
                    // }

                    // if (payload.eventType === 'UPDATE') {
                    //     setDraws(prev =>
                    //         prev.map(d => d.id === payload.new.id ? payload.new : d)
                    //     )
                    // }

                    // if (payload.eventType === 'DELETE') {
                    //     setDraws(prev =>
                    //         prev.filter(d => d.id !== payload.old.id)
                    //     )
                    // }

                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }

    }, [])

    return (
        <DrawsRealtimeContext.Provider value= {{ draws, setDraws }
}>
    { children }
    </DrawsRealtimeContext.Provider>
  )
}

export const useDrawsRealtime = () => useContext(DrawsRealtimeContext)