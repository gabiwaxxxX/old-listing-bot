
import chalk from 'chalk';

const date = chalk.hex('#dd8833');
const text = chalk.hex('#eeeeee');

const format = (t: number) => {
    return ((t < 10) ? '0' : '') + t
}

const getNow = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    return format(hours) + ":" + format(minutes) + ":" + format(seconds);
}

const getDate = () => {
    return date('[' + getNow() +  '] ')
}

const getMsg = (msg: string) => {
    return text(msg)
}

const getArgs = (args: any) => {
    return args || ''
}

const log = (msg: string, args?: any) => {
    console.log( getDate() + getMsg(msg), getArgs(args));
}


export default log;