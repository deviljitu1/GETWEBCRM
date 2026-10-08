import React from 'react';
import Footer from 'components/footer/FooterAuthDefault';
function Default(props: { maincard: React.JSX.Element }) {
  const { maincard } = props;
  return (
    <div className="relative flex">
      <div className="mx-auto flex min-h-full w-full flex-col justify-start pt-12 md:max-w-[75%] lg:max-w-[1013px] lg:px-8 lg:pt-0 xl:min-h-[100vh] xl:max-w-[1383px] xl:px-0 xl:pl-[70px]">
        <div className="mb-auto flex flex-col pl-5 pr-5 md:pl-12 md:pr-0 lg:max-w-[48%] lg:pl-0 xl:max-w-full">

          {maincard}
          <div className="absolute right-0 hidden h-full min-h-screen lg:block lg:w-[49vw] 2xl:w-[44vw]">
            <div
              className={`absolute flex h-full w-full items-end justify-center bg-gradient-to-br from-brand-400 to-brand-600 bg-cover bg-center lg:rounded-bl-[120px] xl:rounded-bl-[200px]`}
            >
              <div className="relative flex h-full w-full flex-col items-center justify-center gap-5 px-12 text-center text-white">
                <span className="text-4xl font-bold tracking-tight xl:text-5xl">GETWEBCRM</span>
                <p className="max-w-sm text-lg text-white/80">A workspace for every client.</p>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default Default;
