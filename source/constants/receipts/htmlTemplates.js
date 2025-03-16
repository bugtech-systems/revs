export const htmlTacloban = (ticketData) => `
    <div>
        <div style="width: 100%; display: flex; flex-direction: row; align-items: center; justify-content: center;">
        <div style="width: 100%; align-items: center;">
        <p style="font-family: monospace; height: 10px; color: black; font-size: 62pt; text-align: center;"><b>OFFICIAL RECEIPT</b></p>
        <p style="font-family: monospace; height: 10px; color: black; font-size: 58pt; text-align: center;"><b>TICKET #: ${data.ticketNo}</b></p>
        <p style="font-family: monospace; monospace; height: 10px; color: black; font-size: 45pt; text-align: center;">${'00000000'}</p>
        <p style="font-family: monospace; text-align: center; font-size: 45pt; height: 10px;"><b>Agent: ${String(data.collector).toUpperCase()}</b></p>
        </div>
        </div>
        <div style="width: 100%; display: flex; flex-direction: row; justify-content: space-between; padding-bottom: 10px;">
            <p style="font-family: monospace; text-align: left; height: 10px; font-size: 45pt;"><b>Total: ${total}</b></p>
            <p style="font-family: monospace; text-align: right; height: 10px; font-size: 45pt;"><b>Game: 3D - ${String(data.gameTime).toUpperCase()}</b></p>
        </div>
        <table style="width: 100%; border: 2px solid black">
        <br/>
      <tr>
        <td style="font-family: monospace; text-align: center; padding: 10px; width: 20%; border-right: 2px solid black;  border-bottom: 2px solid black; font-size: 45pt;">COMBI</td>
        <td style="font-family: monospace; border-right: 2px solid black; text-align: center; padding: 10px; width: 20%; border-bottom: 2px solid black; font-size: 45pt;">S</td>
        <td style="font-family: monospace; border-left: 2px solid black; text-align: center; padding: 10px; width: 20%; border-bottom: 2px solid black; font-size: 45pt;">R</td>
        <td style="font-family: monospace; border-left: 2px solid black;  text-align: center; padding: 10px; width: 20%; border-bottom: 2px solid black; font-size: 45pt;">STAT</td>
      </tr>
      ${result?.map(resItem => (
        `<tr>
          <td style="font-family: monospace; text-align: center; padding: 10px; width: 25%; border-right: 2px solid black; font-size: 45pt;">${resItem.combination.slice(0, 1)}-${resItem.combination.slice(1, 2)}-${resItem.combination.slice(2)}</td>
          <td style="font-family: monospace; text-align: center; padding: 10px; width: 25%; border-right: 2px solid black; font-size: 45pt;">${resItem.straight != 0 ? resItem.straight : '-'}</td>
          <td style="font-family: monospace; text-align: center; padding: 10px; width: 25%; border-left: 2px solid black; font-size: 45pt;">${resItem.ramble != 0 ? resItem.ramble : '-'}</td>
          <td style="font-family: monospace; text-align: center; padding: 10px; width: 25%; font-size: 45pt; border-left: 2px solid black;">OK</td>  
         </tr>`
    ))}
    </table>
    </table>
    </div>
      `;